import { Result, tuple } from '@noshiro/ts-utils';
import {
  Client as DiscordClient,
  DMChannel,
  Message,
  MessageReaction,
  NewsChannel,
  PartialMessage,
  PartialUser,
  TextChannel,
  User,
} from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { emojis, replyTriggerCommand } from './constants';
import { DISCORD_TOKEN } from './env';
import { createSummaryMessage } from './functions/create-summary-message';
import { createTitleString } from './functions/create-title-string';
import { getUserIdsFromAnswers } from './functions/get-user-ids-from-answers';
import { parseCommandArgument } from './functions/parse-command';
import { createUserIdToDisplayNameMap } from './functions/user-id-to-display-name';
import { addPoll, updatePoll, updateVote } from './in-memory-database';
import { createIAnswerOfDate, IAnswerOfDate } from './types/answer-of-date';
import { createIDateOption, IDateOption } from './types/date-option';
import { createIPoll } from './types/poll';
import {
  AnswerType,
  CommandMessageId,
  DatabaseRef,
  DateOptionId,
  PollId,
  Timestamp,
  TitleMessageId,
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

  discordClient.on('messageUpdate', (_oldMessage, newMessage) => {
    updatePollTitle(databaseRef, psqlClient, newMessage)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on message erorr:', result);
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

const sendPollMessageSub = async (
  messageChannel: TextChannel | DMChannel | NewsChannel,
  title: string,
  args: string[]
): Promise<
  Result<
    {
      dateOptions: IList<IDateOption>;
      summaryMessage: Message;
      titleMessageId: TitleMessageId;
    },
    unknown
  >
> => {
  const titleMessage = await messageChannel.send(createTitleString(title));
  const titleMessageId = titleMessage.id as TitleMessageId;

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
      titleMessageId,
    }),
    IMap<UserId, string>()
  );

  const summaryMessageInitResult = await messageChannel
    .send(summaryMessageEmbed)
    .then(Result.ok)
    .catch(Result.err);

  if (Result.isErr(summaryMessageInitResult)) return summaryMessageInitResult;
  const summaryMessageInit = summaryMessageInitResult.value;

  // memo: "（編集済）" という文字列が表示されてずれるのが操作性を若干損ねるので、
  // あえて一度メッセージを送った後再編集している
  const summaryMessageEditResult = await summaryMessageInit
    .edit(summaryMessageEmbed)
    .then(Result.ok)
    .catch(Result.err);

  if (Result.isErr(summaryMessageEditResult)) return summaryMessageEditResult;

  const summaryMessage = summaryMessageEditResult.value;

  return Result.ok({
    titleMessageId,
    dateOptions,
    summaryMessage,
  });
};

export const sendPollMessage = async (
  databaseRef: DatabaseRef,
  psqlClient: PsqlClient,
  message: Message
): Promise<Result<undefined, unknown>> => {
  if (message.partial) {
    message = await message.fetch();
  }

  if (message.author.bot) return Result.ok(undefined);

  if (!message.content.startsWith(`${replyTriggerCommand} `))
    return Result.ok(undefined);

  const [title, ...args] = parseCommandArgument(message.content);

  if (title === undefined) return Result.ok(undefined);

  const replySubResult = await sendPollMessageSub(message.channel, title, args);
  if (Result.isErr(replySubResult)) return replySubResult;
  const { summaryMessage, dateOptions, titleMessageId } = replySubResult.value;

  const addPollResult = await addPoll(
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
      titleMessageId,
    }),
    message.id as CommandMessageId
  );

  return addPollResult;
};

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
      userManager: message.client.users,
      guild: message.guild ?? undefined,
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
    userManager: reaction.message.client.users,
    guild: reaction.message.guild ?? undefined,
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
