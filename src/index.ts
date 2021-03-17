import { tuple } from '@noshiro/ts-utils';
import {
  Client,
  Message,
  MessageReaction,
  PartialUser,
  User,
} from 'discord.js';
import { emojis, replyTriggerCommand } from './constants';
import { createSummaryMessage } from './create-summary-message';
import { addPoll, initializeDatabase, updateVote } from './database';
import { TOKEN } from './env';
import { IList, IMap } from './immutable';
import { parseCommandArgument } from './parse-command';
import { createIAnswerOfDate, IAnswerOfDate } from './types/answer-of-date';
import { createIDatabase } from './types/database';
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

const client = new Client();

const databaseRef: DatabaseRef = {
  db: createIDatabase(),
};

initializeDatabase(databaseRef).catch(console.error);

const reply = async (message: Message): Promise<void> => {
  if (!message.content.startsWith(replyTriggerCommand) || message.author.bot)
    return;

  const [title, ...args]: readonly string[] = parseCommandArgument(
    message.content
  );

  if (title === undefined) return;

  await message.channel.send(`**${title}**`);

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
    .catch((err) => {
      console.error(err);
      return undefined;
    });

  if (summaryMessageResult === undefined) return;

  await addPoll(
    databaseRef,
    createIPoll({
      id: summaryMessageResult.id as PollId,
      updatedAt: (summaryMessageResult.createdTimestamp ??
        Date.now()) as Timestamp,
      title: title ?? '',
      dateOptions,
      answers: IMap<DateOptionId, IAnswerOfDate>(
        dateOptions.map((d) => tuple(d.id, createIAnswerOfDate()))
      ),
    })
  );
};

const onMessageReactCommon = async (
  action: { type: 'add' | 'remove'; value: AnswerType | undefined },
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<void> => {
  if (user.bot) return;
  if (action.value === undefined) return;

  const resultPoll = await updateVote(
    databaseRef,
    reaction.message.id as DateOptionId,
    user.id as UserId,
    { type: action.type, value: action.value }
  );

  if (resultPoll === undefined) return;

  const messages = await reaction.message.channel.messages
    .fetch({ after: reaction.message.id })
    .catch(console.error);

  if (!messages) return;

  messages
    .find((m) => m.embeds.length > 0 && m.id === resultPoll.id)
    ?.edit(createSummaryMessage(resultPoll))
    .catch(console.error);
};

const onMessageReactionAdd = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<void> => {
  await onMessageReactCommon(
    {
      type: 'add',
      value:
        emojis.ok.unicode === reaction.emoji.name
          ? 'ok'
          : emojis.ng.unicode === reaction.emoji.name
          ? 'ng'
          : emojis.neither.unicode === reaction.emoji.name
          ? 'neither'
          : undefined,
    },
    reaction,
    user
  );

  // const userReactions = reaction.message.reactions.cache.filter((reaction) =>
  //   reaction.users.cache.has(user.id)
  // );

  // await Promise.all(userReactions.map((r) => r.users.remove(user.id)));
};

const onMessageReactionRemove = async (
  reaction: MessageReaction,
  user: User | PartialUser
): Promise<void> =>
  onMessageReactCommon(
    {
      type: 'remove',

      value:
        emojis.ok.unicode === reaction.emoji.name
          ? 'ok'
          : emojis.ng.unicode === reaction.emoji.name
          ? 'ng'
          : emojis.neither.unicode === reaction.emoji.name
          ? 'neither'
          : undefined,
    },
    reaction,
    user
  );

client.on('messageReactionAdd', (reaction, user) => {
  onMessageReactionAdd(reaction, user).catch(console.error);
});

client.on('messageReactionRemove', (reaction, user) => {
  onMessageReactionRemove(reaction, user).catch(console.error);
});

client.on('message', (message) => {
  reply(message).catch(console.error);
});

client.once('ready', () => {
  console.log('Ready!');
});

client.login(TOKEN).catch(console.error);
