import { match, promiseToResult, Result } from '@noshiro/ts-utils';
import type { MessageReaction, PartialUser, User } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { emojis } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updateVote } from '../in-memory-database';
import type { Poll } from '../types/poll';
import type { AnswerType, DatabaseRef } from '../types/types';
import { createDateOptionId, createUserId } from '../types/types';
import { fixAnswerAndUpdateMessage } from './fix-answer';

const onRefreshClick = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  reactionFilled: MessageReaction
): Promise<Result<undefined, string>> => {
  const messages = await reactionFilled.message.channel.messages.fetch({
    around: reactionFilled.message.id,
  });

  const poll: Poll | undefined = databaseRef.db.polls.get(
    reactionFilled.message.id
  );

  if (poll === undefined) return Result.err('poll not found');

  const userIdToDisplayNameResult = await createUserIdToDisplayNameMap(
    reactionFilled.message.guild,
    getUserIdsFromAnswers(poll.answers).toArray()
  );

  if (Result.isErr(userIdToDisplayNameResult)) {
    return userIdToDisplayNameResult;
  }

  const userIdToDisplayName = userIdToDisplayNameResult.value;

  const fixAnswerAndUpdateMessageResult = await fixAnswerAndUpdateMessage(
    databaseRef,
    psqlClient,
    messages,
    poll,
    userIdToDisplayName
  );

  if (Result.isErr(fixAnswerAndUpdateMessageResult)) {
    return fixAnswerAndUpdateMessageResult;
  }

  const users = await reactionFilled.users.fetch();

  const result = await Promise.all(
    users
      .filter((u) => !u.bot)
      .map((u) => promiseToResult(reactionFilled.users.remove(u.id)))
  );

  if (result.some(Result.isErr)) {
    return Result.err(
      JSON.stringify(
        result.map((a) => a.value),
        undefined,
        2
      )
    );
  }

  return Result.ok(undefined);
};

export const onMessageReactCommon = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  action: Readonly<{
    type: 'add' | 'remove';
    value: AnswerType | 'refresh' | undefined;
  }>,
  reaction: MessageReaction,
  user: PartialUser | User
): Promise<Result<undefined, unknown>> => {
  const reactionFilled: MessageReaction = reaction.partial
    ? await reaction.fetch()
    : reaction;

  if (user.bot) return Result.ok(undefined);
  if (action.value === undefined) return Result.ok(undefined);

  if (action.value === 'refresh') {
    if (action.type === 'add') {
      return onRefreshClick(databaseRef, psqlClient, reactionFilled);
    }
    return Result.ok(undefined);
  }

  const dateOptionId = createDateOptionId(reactionFilled.message.id);

  const [resultPollResult, messages] = await Promise.all([
    updateVote(databaseRef, psqlClient, dateOptionId, createUserId(user.id), {
      type: action.type,
      value: action.value,
    }),
    reactionFilled.message.channel.messages.fetch({
      after: dateOptionId,
    }),
  ]);

  if (Result.isErr(resultPollResult)) return resultPollResult;
  const resultPoll = resultPollResult.value;
  if (messages.size === 0) return Result.err('messages not found.');

  const userIdToDisplayNameResult = await createUserIdToDisplayNameMap(
    reactionFilled.message.guild,
    getUserIdsFromAnswers(resultPoll.answers).toArray()
  );

  if (Result.isErr(userIdToDisplayNameResult)) {
    return userIdToDisplayNameResult;
  }

  const userIdToDisplayName = userIdToDisplayNameResult.value;

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
): AnswerType | 'refresh' | undefined =>
  match(reactionEmojiName, {
    [emojis.ok.unicode]: 'ok',
    [emojis.ng.unicode]: 'ng',
    [emojis.neither.unicode]: 'neither',
    [emojis.refresh.unicode]: 'refresh',
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
