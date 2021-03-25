import { Result } from '@noshiro/ts-utils';
import { Message, PartialMessage } from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { replyTriggerCommand } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { parseCommandArgument } from '../functions/parse-command';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updatePoll } from '../in-memory-database';
import { CommandMessageId, DatabaseRef } from '../types/types';

export const updatePollTitle = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  message: Message | PartialMessage
): Promise<Result<undefined, unknown>> => {
  if (message.partial) {
    message = await message.fetch();
  }

  if (message.author.bot) return Result.ok(undefined);

  if (!message.content.startsWith(`${replyTriggerCommand} `))
    return Result.ok(undefined);

  const [title] = parseCommandArgument(message.content);

  if (title === undefined) return Result.ok(undefined);

  const pollId = databaseRef.db.commandMessageIdToPollIdMap.get(
    message.id as CommandMessageId
  );
  if (pollId === undefined) return Result.ok(undefined);

  const poll = databaseRef.db.polls.get(pollId);
  if (poll === undefined) return Result.ok(undefined);

  const [userIdToDisplayName, messages] = await Promise.all([
    createUserIdToDisplayNameMap({
      userIds: getUserIdsFromAnswers(poll.answers),
      message,
    }),
    message.channel.messages.fetch({
      after: message.id,
    }),
  ]);

  const newPoll = poll.set('title', title);

  const [
    updateSummaryMessageResult,
    updateTitleMessageResult,
    updatePollResult,
  ] = await Promise.all([
    messages
      .find((m) => m.id === pollId)
      ?.edit(createSummaryMessage(newPoll, userIdToDisplayName))
      .then(() => Result.ok(undefined))
      .catch(Result.err),
    messages
      .find((m) => m.id === poll.titleMessageId)
      ?.edit(createTitleString(title))
      .then(() => Result.ok(undefined))
      .catch(Result.err),
    updatePoll(databaseRef, psqlClient, newPoll),
  ]);

  if (updateSummaryMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateSummaryMessageResult))
    return updateSummaryMessageResult;
  if (updateTitleMessageResult === undefined) return Result.ok(undefined);
  if (Result.isErr(updateTitleMessageResult)) return updateTitleMessageResult;

  return updatePollResult;
};
