import type { DeepReadonly } from '@noshiro/ts-utils';
import {
  IRecord,
  ISet,
  isNotUndefined,
  ituple,
  pipe,
  promiseToResult,
  Result,
} from '@noshiro/ts-utils';
import type { Message, MessageReaction, PartialMessage } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { replyTriggerCommand } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { emojiIdFromUnicode } from '../functions/emoji-id-from-unicode';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { parseCommandArgument } from '../functions/parse-command';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updatePoll } from '../in-memory-database';
import type { Poll } from '../types/poll';
import type { AnswerType, DatabaseRef } from '../types/types';
import { createCommandMessageId } from '../types/types';

export const updatePollTitle = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  message: Message | PartialMessage
): Promise<Result<undefined, unknown>> => {
  const messageFilled = message.partial ? await message.fetch() : message;

  if (messageFilled.author.bot) return Result.ok(undefined);

  if (!messageFilled.content.startsWith(`${replyTriggerCommand} `))
    return Result.ok(undefined);

  const [title] = parseCommandArgument(messageFilled.content);

  if (title === undefined) return Result.ok(undefined);

  const pollId = databaseRef.db.commandMessageIdToPollIdMap.get(
    createCommandMessageId(messageFilled.id)
  );
  if (pollId === undefined) return Result.ok(undefined);

  const poll = databaseRef.db.polls.get(pollId);
  if (poll === undefined) return Result.ok(undefined);

  const [userIdToDisplayName, messages] = await Promise.all([
    createUserIdToDisplayNameMap({
      userIds: getUserIdsFromAnswers(poll.answers),
      message: messageFilled,
    }),
    messageFilled.channel.messages.fetch({
      after: messageFilled.id,
    }),
  ]);

  const newPoll = IRecord.set(poll, 'title', title);

  const [updateSummaryMessageResult, updateTitleMessageResult] =
    await Promise.all([
      promiseToResult(
        messages
          .find((m) => m.id === pollId)
          ?.edit(createSummaryMessage(newPoll, userIdToDisplayName)) ??
          Promise.resolve(undefined)
      ),
      promiseToResult(
        messages
          .find((m) => m.id === poll.titleMessageId)
          ?.edit(createTitleString(title)) ?? Promise.resolve(undefined)
      ),
    ]);

  if (updateSummaryMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateSummaryMessageResult))
    return updateSummaryMessageResult;
  if (updateTitleMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateTitleMessageResult)) return updateTitleMessageResult;

  // reactions を取得して poll.answers を修復（データベースが壊れたときの保険）
  const dateOptionMessages = poll.dateOptions
    .map((dateOption) =>
      ituple(
        dateOption.id,
        messages.find((m) => m.id === dateOption.id)
      )
    )
    .filter(isNotUndefined);

  const reactionsForThisPoll: DeepReadonly<
    {
      dateId: string;
      reactions: {
        emoji: AnswerType;
        userIds: string[];
      }[];
    }[]
  > = await Promise.all(
    dateOptionMessages.map(([dateId, msg]) =>
      Promise.all(
        [...(msg?.reactions.cache.entries() ?? [])]
          .map(([emoji, v]) => ituple(emojiIdFromUnicode(emoji), v))
          .filter((a): a is [AnswerType, MessageReaction] =>
            isNotUndefined(a[0])
          )
          .map(([emoji, v]) =>
            v.users.fetch().then((users) => ({
              emoji,
              userIds: [...users.values()]
                .map((u) => u.id)
                .filter((uid) => isNotUndefined(userIdToDisplayName.get(uid))),
            }))
          )
      ).then((res) => ({ dateId, reactions: res }))
    )
  );

  const newPollFilled: Poll = pipe(poll)
    .chain((pl) => IRecord.set(pl, 'title', title))
    .chain((pl) =>
      IRecord.update(pl, 'answers', (answers) =>
        answers.withMutations(
          reactionsForThisPoll.map(({ dateId, reactions }) => ({
            type: 'set',
            key: dateId,
            value: {
              ok: ISet.new(
                reactions.find((r) => r.emoji === 'ok')?.userIds ?? []
              ),
              ng: ISet.new(
                reactions.find((r) => r.emoji === 'ng')?.userIds ?? []
              ),
              neither: ISet.new(
                reactions.find((r) => r.emoji === 'neither')?.userIds ?? []
              ),
            },
          }))
        )
      )
    ).value;

  const updatePollResult = await updatePoll(
    databaseRef,
    psqlClient,
    newPollFilled
  );

  return updatePollResult;
};
