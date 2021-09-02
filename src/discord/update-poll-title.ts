import { IRecord, promiseToResult, Result } from '@noshiro/ts-utils';
import type { Message, PartialMessage } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { triggerCommand } from '../constants';
import { rpCreateSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { rpParseCommandArgument } from '../functions/parse-command';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import type { DatabaseRef } from '../types/types';
import { createCommandMessageId } from '../types/types';
import { fixAnswerAndUpdateMessage } from './fix-answer';

export const updatePollTitle = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  message: Message | PartialMessage
): Promise<Result<undefined, unknown>> => {
  const messageFilled = message.partial ? await message.fetch() : message;

  if (messageFilled.author.bot) return Result.ok(undefined);

  if (
    !messageFilled.content.startsWith(`${triggerCommand.rp} `) &&
    !messageFilled.content.startsWith(`${triggerCommand.rp30} `) &&
    !messageFilled.content.startsWith(`${triggerCommand.rp60} `)
  ) {
    return Result.ok(undefined);
  }

  const [title] = rpParseCommandArgument(messageFilled.content);

  if (title === undefined) return Result.ok(undefined);

  const pollId = databaseRef.db.commandMessageIdToPollIdMap.get(
    createCommandMessageId(messageFilled.id)
  );
  if (pollId === undefined) return Result.ok(undefined);

  const poll = databaseRef.db.polls.get(pollId);
  if (poll === undefined) return Result.ok(undefined);

  const [userIdToDisplayNameResult, messages] = await Promise.all([
    createUserIdToDisplayNameMap(
      messageFilled.guild,
      getUserIdsFromAnswers(poll.answers).toArray()
    ),
    messageFilled.channel.messages.fetch({
      after: messageFilled.id,
    }),
  ]);

  if (Result.isErr(userIdToDisplayNameResult)) {
    return userIdToDisplayNameResult;
  }

  const userIdToDisplayName = userIdToDisplayNameResult.value;

  const newPoll = IRecord.set(poll, 'title', title);

  const [updateSummaryMessageResult, updateTitleMessageResult] =
    await Promise.all([
      promiseToResult(
        messages
          .find((m) => m.id === pollId)
          ?.edit(rpCreateSummaryMessage(newPoll, userIdToDisplayName)) ??
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

  return fixAnswerAndUpdateMessage(databaseRef, psqlClient, messages, poll);
};
