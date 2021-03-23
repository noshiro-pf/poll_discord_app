import { Result, tuple } from '@noshiro/ts-utils';
import {
  Client as DiscordClient,
  DMChannel,
  Message,
  MessageReaction,
  NewsChannel,
  PartialUser,
  TextChannel,
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
          discordClient.user
            ?.setActivity({
              name: replyTriggerCommand,
              type: 'PLAYING',
            })
            .then(() => resolve(Result.ok(undefined)))
            .catch(Result.err);
        });
      }),
      discordClient
        .login(DISCORD_TOKEN)
        .then(() => Result.ok(undefined))
        .catch(Result.err),
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
  databaseRef: DatabaseRef
): void => {
  discordClient.on('messageReactionAdd', (reaction, user) => {
    onMessageReactionAdd(databaseRef, psqlClient, reaction, user)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on messageReactionAdd error:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('messageReactionRemove', (reaction, user) => {
    onMessageReactionRemove(databaseRef, psqlClient, reaction, user)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on messageReactionRemove error:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('message', (message) => {
    sendPollMessage(databaseRef, psqlClient, message)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on message erorr:', result);
        }
      })
      .catch(console.error);
  });
};

const replySub = async (
  messageChannel: TextChannel | DMChannel | NewsChannel,
  title: string,
  args: string[]
): Promise<
  Result<{ dateOptions: IList<IDateOption>; summaryMessage: Message }, unknown>
> => {
  await messageChannel.send(createTitleString(title));

  const dateOptionsTemp: IDateOption[] = [];

  for (const el of args) {
    const result = await messageChannel.send(el).catch((err) => {
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

  // memo: "（編集済）" という文字列が表示されてずれるのが操作性を若干損ねるので、
  // あえて一度メッセージを送った後再編集している
  const summaryMessageInitResult = await messageChannel
    .send(summaryMessageEmbed)
    .then(Result.ok)
    .catch(Result.err);

  if (Result.isErr(summaryMessageInitResult)) return summaryMessageInitResult;
  const summaryMessageInit = summaryMessageInitResult.value;

  const summaryMessageEditResult = await summaryMessageInit
    .edit(summaryMessageEmbed)
    .then(Result.ok)
    .catch(Result.err);

  if (Result.isErr(summaryMessageEditResult)) return summaryMessageEditResult;

  const summaryMessage = summaryMessageEditResult.value;

  return Result.ok({ dateOptions, summaryMessage: summaryMessage });
};

export const sendPollMessage = async (
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

  const replySubResult = await replySub(message.channel, title, args);
  if (Result.isErr(replySubResult)) return replySubResult;
  const { summaryMessage, dateOptions } = replySubResult.value;

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
