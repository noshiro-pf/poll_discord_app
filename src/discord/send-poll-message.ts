import { Result, tuple } from '@noshiro/ts-utils';
import { DMChannel, Message, NewsChannel, TextChannel } from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { emojis, replyTriggerCommand } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { parseCommandArgument } from '../functions/parse-command';
import { addPoll } from '../in-memory-database';
import { createIAnswerOfDate, IAnswerOfDate } from '../types/answer-of-date';
import { createIDateOption, IDateOption } from '../types/date-option';
import { createIPoll } from '../types/poll';
import {
  CommandMessageId,
  DatabaseRef,
  DateOptionId,
  PollId,
  Timestamp,
  TitleMessageId,
  UserId,
} from '../types/types';
import { IList, IMap } from '../utils/immutable';

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
