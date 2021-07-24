import { match, promiseToResult, Result } from '@noshiro/ts-utils';
import type { MessageReaction, PartialUser, User } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { emojis } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updateVote } from '../in-memory-database';
import type { AnswerType, DatabaseRef } from '../types/types';
import { createDateOptionId, createUserId } from '../types/types';

export const onMessageReactCommon = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  action: Readonly<{ type: 'add' | 'remove'; value: AnswerType | undefined }>,
  reaction: MessageReaction,
  user: PartialUser | User
): Promise<Result<undefined, unknown>> => {
  const reactionFilled: MessageReaction = reaction.partial
    ? await reaction.fetch()
    : reaction;

  if (user.bot) return Result.ok(undefined);
  if (action.value === undefined) return Result.ok(undefined);

  const [resultPollResult, messages] = await Promise.all([
    updateVote(
      databaseRef,
      psqlClient,
      createDateOptionId(reactionFilled.message.id),
      createUserId(user.id),
      { type: action.type, value: action.value }
    ),
    reactionFilled.message.channel.messages.fetch({
      after: reactionFilled.message.id,
    }),
  ]);

  if (Result.isErr(resultPollResult)) return resultPollResult;
  const resultPoll = resultPollResult.value;
  if (messages.size === 0) return Result.err('messages not found.');

  const userIdToDisplayName = await createUserIdToDisplayNameMap({
    userIds: getUserIdsFromAnswers(resultPoll.answers),
    message: reactionFilled.message,
  });

  const result = await promiseToResult(
    messages
      .find((m) => m.id === resultPoll.id)
      ?.edit(createSummaryMessage(resultPoll, userIdToDisplayName))
      .then(() => undefined) ??
      Promise.reject(Result.err(`message with id ${resultPoll.id} not found`))
  );

  return result;
};

const mapReactionEmojiNameToAnswerType = (
  reactionEmojiName: string
): AnswerType | undefined =>
  match(reactionEmojiName, {
    [emojis.ok.unicode]: 'ok',
    [emojis.ng.unicode]: 'ng',
    [emojis.neither.unicode]: 'neither',
  });

export const onMessageReactionAdd = (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  reaction: MessageReaction,
  user: PartialUser | User
): Promise<Result<undefined, unknown>> =>
  onMessageReactCommon(
    databaseRef,
    psqlClient,
    {
      type: 'add',
      value: mapReactionEmojiNameToAnswerType(reaction.emoji.name),
    },
    reaction,
    user
  );

export const onMessageReactionRemove = (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  reaction: MessageReaction,
  user: PartialUser | User
): Promise<Result<undefined, unknown>> =>
  onMessageReactCommon(
    databaseRef,
    psqlClient,
    {
      type: 'remove',
      value: mapReactionEmojiNameToAnswerType(reaction.emoji.name),
    },
    reaction,
    user
  );
