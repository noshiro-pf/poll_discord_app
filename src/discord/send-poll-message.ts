import type { DeepReadonly } from '@noshiro/ts-utils';
import { IMap, promiseToResult, Result, tuple } from '@noshiro/ts-utils';
import type { DMChannel, Message, NewsChannel, TextChannel } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { emojis, replyTriggerCommand } from '../constants';
import { createSummaryMessage } from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { parseCommandArgument } from '../functions/parse-command';
import { addPoll } from '../in-memory-database';
import type { AnswerOfDate } from '../types/answer-of-date';
import { defaultAnswerOfDate } from '../types/answer-of-date';
import type { DateOption } from '../types/date-option';
import type {
  DatabaseRef,
  DateOptionId,
  TitleMessageId,
  UserId,
} from '../types/types';
import {
  createCommandMessageId,
  createDateOptionId,
  createPollId,
  createTimestamp,
  createTitleMessageId,
} from '../types/types';

const sendPollMessageSub = async (
  messageChannel: DMChannel | NewsChannel | TextChannel,
  title: string,
  args: readonly string[]
): Promise<
  Result<
    DeepReadonly<{
      dateOptions: DateOption[];
      dateOptionMessageList: Message[];
      summaryMessage: Message;
      titleMessageId: TitleMessageId;
    }>,
    unknown
  >
> => {
  const titleMessage = await messageChannel.send(createTitleString(title));
  const titleMessageId = createTitleMessageId(titleMessage.id);

  const dateOptionAndMessageListTemp: [DateOption, Message][] = [];

  for (const el of args) {
    // eslint-disable-next-line no-await-in-loop
    const result = await promiseToResult(messageChannel.send(el));

    if (Result.isErr(result)) return result;
    dateOptionAndMessageListTemp.push([
      {
        label: el,
        id: createDateOptionId(result.value.id),
      },
      result.value,
    ]);
  }

  const dateOptionMessageList = dateOptionAndMessageListTemp.map(([, a]) => a);
  const dateOptions = dateOptionAndMessageListTemp.map(([a]) => a);

  const summaryMessageEmbed = createSummaryMessage(
    {
      id: createPollId(''),
      updatedAt: createTimestamp(Date.now()),
      title: title ?? '',
      dateOptions,
      answers: IMap.new<DateOptionId, AnswerOfDate>(
        dateOptions.map((d) => tuple(d.id, defaultAnswerOfDate))
      ),
      titleMessageId,
    },
    IMap.new<UserId, string>([])
  );

  const summaryMessageInitResult = await promiseToResult(
    messageChannel.send(summaryMessageEmbed)
  );

  if (Result.isErr(summaryMessageInitResult)) return summaryMessageInitResult;
  const summaryMessageInit = summaryMessageInitResult.value;

  // memo: "（編集済）" という文字列が表示されてずれるのが操作性を若干損ねるので、
  // あえて一度メッセージを送った後再編集している
  const summaryMessageEditResult = await promiseToResult(
    summaryMessageInit.edit(summaryMessageEmbed)
  );

  if (Result.isErr(summaryMessageEditResult)) return summaryMessageEditResult;

  const summaryMessage = summaryMessageEditResult.value;

  const summaryMessageReactResult = await promiseToResult(
    summaryMessage.react(emojis.refresh.unicode)
  );

  if (Result.isErr(summaryMessageReactResult)) return summaryMessageReactResult;

  return Result.ok({
    titleMessageId,
    dateOptions,
    dateOptionMessageList,
    summaryMessage,
  });
};

export const sendPollMessage = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  message: Message
): Promise<Result<undefined, unknown>> => {
  const messageFilled: Message = message.partial
    ? await message.fetch()
    : message;

  if (messageFilled.author.bot) return Result.ok(undefined);

  if (!messageFilled.content.startsWith(`${replyTriggerCommand} `))
    return Result.ok(undefined);

  const [title, ...args] = parseCommandArgument(messageFilled.content);

  if (title === undefined) return Result.ok(undefined);
  if (args.length === 0) return Result.ok(undefined);

  const replySubResult = await sendPollMessageSub(
    messageFilled.channel,
    title,
    args
  );
  if (Result.isErr(replySubResult)) return replySubResult;
  const { summaryMessage, dateOptions, dateOptionMessageList, titleMessageId } =
    replySubResult.value;

  const addPollResult = await addPoll(
    databaseRef,
    psqlClient,
    {
      id: createPollId(summaryMessage.id),
      updatedAt: createTimestamp(summaryMessage.createdTimestamp ?? Date.now()),
      title: title ?? '',
      dateOptions,
      answers: IMap.new<DateOptionId, AnswerOfDate>(
        dateOptions.map((d) => tuple(d.id, defaultAnswerOfDate))
      ),
      titleMessageId,
    },
    createCommandMessageId(messageFilled.id)
  );

  await Promise.all(
    dateOptionMessageList.map(async (msg) => {
      await msg.react(emojis.ok.unicode);
      await msg.react(emojis.neither.unicode);
      await msg.react(emojis.ng.unicode);
    })
  );

  return addPollResult;
};
