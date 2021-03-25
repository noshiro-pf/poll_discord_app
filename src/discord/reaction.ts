import { Result } from '@noshiro/ts-utils';
import { MessageReaction, PartialUser, User } from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { emojis } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { getUserIdsFromAnswers } from '../functions/get-user-ids-from-answers';
import { createUserIdToDisplayNameMap } from '../functions/user-id-to-display-name';
import { updateVote } from '../in-memory-database';
import { AnswerType, DatabaseRef, DateOptionId, UserId } from '../types/types';

export const onMessageReactCommon = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  action: { type: 'add' | 'remove'; value: AnswerType | undefined },
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<Result<undefined, unknown>> => {
  if (reaction.partial) {
    reaction = await reaction.fetch();
  }

  if (user.bot) return Result.ok(undefined);
  if (action.value === undefined) return Result.ok(undefined);

  const [resultPollResult, messages] = await Promise.all([
    updateVote(
      databaseRef,
      psqlClient,
      reaction.message.id as DateOptionId,
      user.id as UserId,
      { type: action.type, value: action.value }
    ),
    reaction.message.channel.messages.fetch({
      after: reaction.message.id,
    }),
  ]);

  if (Result.isErr(resultPollResult)) return resultPollResult;
  const resultPoll = resultPollResult.value;
  if (!messages) return Result.err('messages not found.');

  const userIdToDisplayName = await createUserIdToDisplayNameMap({
    userIds: getUserIdsFromAnswers(resultPoll.answers),
    message: reaction.message,
  });

  const result = await messages
    .find((m) => m.id === resultPoll.id)
    ?.edit(createSummaryMessage(resultPoll, userIdToDisplayName))
    .then(() => Result.ok(undefined))
    .catch(Result.err);

  return result ?? Result.err(`message with id ${resultPoll.id} not found`);
};

const mapReactionEmojiNameToAnswerType = (
  reactionEmojiName: string
): AnswerType | undefined =>
  emojis.ok.unicode === reactionEmojiName
    ? 'ok'
    : emojis.ng.unicode === reactionEmojiName
    ? 'ng'
    : emojis.neither.unicode === reactionEmojiName
    ? 'neither'
    : undefined;

export const onMessageReactionAdd = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  reaction: MessageReaction,
  user: User | PartialUser
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

export const onMessageReactionRemove = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  reaction: MessageReaction,
  user: User | PartialUser
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
