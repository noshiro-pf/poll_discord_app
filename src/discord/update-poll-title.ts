import { IRecord, promiseToResult, Result } from '@noshiro/ts-utils';
import type { Message, PartialMessage } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { replyTriggerCommand } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { parseCommandArgument } from '../functions/parse-command';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updatePoll } from '../in-memory-database';
import type { DatabaseRef } from '../types/types';
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

  const [
    updateSummaryMessageResult,
    updateTitleMessageResult,
    updatePollResult,
  ] = await Promise.all([
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
    updatePoll(databaseRef, psqlClient, newPoll),
  ]);

  if (updateSummaryMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateSummaryMessageResult))
    return updateSummaryMessageResult;
  if (updateTitleMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateTitleMessageResult)) return updateTitleMessageResult;

  return updatePollResult;
};
