import { Result, tuple } from '@noshiro/ts-utils';
import {
  Client as DiscordClient,
  Message,
  MessageReaction,
  PartialUser,
  User,
} from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { emojis, replyTriggerCommand } from './constants';
import { DISCORD_TOKEN } from './env';
import { createSummaryMessage } from './functions/create-summary-message';
import { createTitleString } from './functions/create-title-string';
import { parseCommandArgument } from './functions/parse-command';
import { addPoll, updateVote } from './in-memory-database';
import { createIAnswerOfDate, IAnswerOfDate } from './types/answer-of-date';
import { createIDateOption, IDateOption } from './types/date-option';
import { createIPoll } from './types/poll';
import {
  AnswerType,
  DatabaseRef,
  DateOptionId,
  PollId,
  Timestamp,
  UserId,
} from './types/types';
import { IList, IMap } from './utils/immutable';

export const initDiscordClient = (): Promise<Result<DiscordClient, unknown>> =>
  new Promise((resolveAll) => {
    const discordClient = new DiscordClient({
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    });

    Promise.all([
      new Promise<Result<undefined, undefined>>((resolve) => {
        discordClient.once('ready', () => {
          resolve(Result.ok(undefined));
        });
      }),
      new Promise<Result<undefined, undefined>>((resolve) => {
        discordClient
          .login(DISCORD_TOKEN)
          .then(() => {
            resolve(Result.ok(undefined));
          })
          .catch((err) => {
            resolve(Result.err(err));
          });
      }),
    ])
      .then(([ready, login]) =>
        Result.isErr(ready)
          ? resolveAll(Result.err(ready))
          : Result.isErr(login)
          ? resolveAll(Result.err(login))
          : resolveAll(Result.ok(discordClient))
      )
      .catch(() => resolveAll(Result.err(undefined)));
  });

export const startDiscordListener = (
  discordClient: DiscordClient,
  psqlClient: PsqlClient,
  databaseRef: DatabaseRef,
  onMessageReactionAdd: (
    databaseRef: DatabaseRef,
    psqlClient: PsqlClient,
    reaction: MessageReaction,
    user: User | PartialUser
  ) => Promise<Result<undefined, unknown>>,
  onMessageReactionRemove: (
    databaseRef: DatabaseRef,
    psqlClient: PsqlClient,
    reaction: MessageReaction,
    user: User | PartialUser
  ) => Promise<Result<undefined, unknown>>,
  reply: (
    databaseRef: DatabaseRef,
    psqlClient: PsqlClient,
    message: Message
  ) => Promise<Result<undefined, unknown>>
): void => {
  discordClient.on('messageReactionAdd', (reaction, user) => {
    onMessageReactionAdd(databaseRef, psqlClient, reaction, user).catch(
      console.error
    );
  });

  discordClient.on('messageReactionRemove', (reaction, user) => {
    onMessageReactionRemove(databaseRef, psqlClient, reaction, user).catch(
      console.error
    );
  });

  discordClient.on('message', (message) => {
    reply(databaseRef, psqlClient, message).catch(console.error);
  });
};

export const reply = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  message: Message
): Promise<Result<undefined, unknown>> => {
  if (message.partial) {
    await message.fetch();
  }

  if (message.author.bot) return Result.ok(undefined);

  if (!message.content.startsWith(`${replyTriggerCommand} `))
    return Result.ok(undefined);

  const [title, ...args] = parseCommandArgument(message.content);

  if (title === undefined) return Result.ok(undefined);

  await message.channel.send(createTitleString(title));

  const dateOptionsTemp: IDateOption[] = [];

  for (const el of args) {
    const result = await message.channel.send(el).catch((err) => {
      console.error(err);
      return undefined;
    });
    if (result === undefined) continue;
    await result.react(emojis.ok.unicode);
    await result.react(emojis.neither.unicode);
    await result.react(emojis.ng.unicode);
    dateOptionsTemp.push(
      createIDateOption({
        label: el,
        id: result.id as DateOptionId,
      })
    );
  }

  const dateOptions = IList(dateOptionsTemp);

  const summaryMessageEmbed = createSummaryMessage(
    createIPoll({
      id: '' as PollId,
      updatedAt: Date.now() as Timestamp,
      title: title ?? '',
      dateOptions,
      answers: IMap<DateOptionId, IAnswerOfDate>(
        dateOptions.map((d) => tuple(d.id, createIAnswerOfDate()))
      ),
    })
  );

  const summaryMessageResult = await message.channel
    .send(summaryMessageEmbed)
    .then(Result.ok)
    .catch(Result.err);

  if (Result.isErr(summaryMessageResult)) return summaryMessageResult;
  const summaryMessage = summaryMessageResult.value;

  const res = await addPoll(
    databaseRef,
    psqlClient,
    createIPoll({
      id: summaryMessage.id as PollId,
      updatedAt: (summaryMessage.createdTimestamp ?? Date.now()) as Timestamp,
      title: title ?? '',
      dateOptions,
      answers: IMap<DateOptionId, IAnswerOfDate>(
        dateOptions.map((d) => tuple(d.id, createIAnswerOfDate()))
      ),
    })
  );

  return res;
};

export const onMessageReactCommon = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  action: { type: 'add' | 'remove'; value: AnswerType | undefined },
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<Result<undefined, unknown>> => {
  if (reaction.partial) {
    await reaction.fetch();
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
  if (!messages) return Result.err(`messages not found.`);

  const result = await messages
    .find((m) => m.embeds.length > 0 && m.id === resultPoll.id)
    ?.edit(createSummaryMessage(resultPoll))
    .then(() => Result.ok(undefined))
    .catch((err) => Result.err(err));

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
