import type { DeepReadonly, uint32 } from '@noshiro/ts-utils';
import { IMap, promiseToResult, Result, tuple } from '@noshiro/ts-utils';
import type { DMChannel, Message, NewsChannel, TextChannel } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { emojis, triggerCommand } from '../constants';
import {
  convertRp30ArgToRpArgs,
  convertRp60ArgToRpArgs,
} from '../functions/convert-rp30-args-to-rp-args';
import {
  gpCreateSummaryMessage,
  rpCreateSummaryMessage,
} from '../functions/create-summary-message';
import { createTitleString } from '../functions/create-title-string';
import { generateGroups } from '../functions/generate-groups';
import {
  gpParseGroupingCommandArgument,
  gpParseRandCommandArgument,
  rpParseCommand,
} from '../functions/parse-command';
import { removeCommandPrefix } from '../functions/remove-command-prefix';
import { addPoll } from '../in-memory-database';
import type { AnswerOfDate } from '../types/answer-of-date';
import { defaultAnswerOfDate } from '../types/answer-of-date';
import type { DateOption } from '../types/date-option';
import type { Group } from '../types/group';
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

const rpSendPollMessageSub = async (
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

  const summaryMessageEmbed = rpCreateSummaryMessage(
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

const rpSendPollMessage = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  discordChannel: Message['channel'],
  messageId: string,
  title: string | undefined,
  pollOptions: readonly string[]
): Promise<Result<undefined, unknown>> => {
  if (title === undefined) return Result.ok(undefined);
  if (pollOptions.length === 0) return Result.ok(undefined);

  const replySubResult = await rpSendPollMessageSub(
    discordChannel,
    title,
    pollOptions
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
    createCommandMessageId(messageId)
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

const gpSendGroupingMessageSub = async (
  messageChannel: DMChannel | NewsChannel | TextChannel,
  groups: readonly Group[]
): Promise<Result<undefined, unknown>> => {
  const summaryMessageResult = await promiseToResult(
    messageChannel.send(gpCreateSummaryMessage(groups))
  );

  return Result.map(() => undefined)(summaryMessageResult);
};

const gpSendRandMessageSub = async (
  messageChannel: DMChannel | NewsChannel | TextChannel,
  n: uint32
): Promise<Result<undefined, unknown>> => {
  const summaryMessageResult = await promiseToResult(
    messageChannel.send(Math.ceil(Math.random() * n))
  );

  return Result.map(() => undefined)(summaryMessageResult);
};

const gpSendGroupingMessage = async (
  messageFilled: Message
): Promise<Result<undefined, unknown>> => {
  const parseResult = gpParseGroupingCommandArgument(
    removeCommandPrefix(messageFilled.content, triggerCommand.gp)
  );
  if (Result.isErr(parseResult)) return Result.ok(undefined);
  const [numGroups, nameList] = parseResult.value;

  if (nameList.length === 0) return Result.ok(undefined);
  if (nameList.length < numGroups) return Result.ok(undefined);

  const replySubResult = await gpSendGroupingMessageSub(
    messageFilled.channel,
    generateGroups(numGroups, nameList)
  );

  return replySubResult;
};

const gpSendRandMessage = async (
  messageFilled: Message
): Promise<Result<undefined, unknown>> => {
  const parseResult = gpParseRandCommandArgument(
    removeCommandPrefix(messageFilled.content, triggerCommand.rand)
  );

  if (Result.isErr(parseResult)) return Result.ok(undefined);
  const n = parseResult.value;

  const replySubResult = await gpSendRandMessageSub(messageFilled.channel, n);

  return replySubResult;
};

export const sendMessageMain = async (
  databaseRef: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  message: Message
): Promise<Result<undefined, unknown>> => {
  const messageFilled: Message = message.partial
    ? await message.fetch()
    : message;

  if (messageFilled.author.bot) return Result.ok(undefined);

  if (messageFilled.content.startsWith(`${triggerCommand.gp} `)) {
    return gpSendGroupingMessage(messageFilled);
  }

  if (messageFilled.content.startsWith(`${triggerCommand.rand} `)) {
    return gpSendRandMessage(messageFilled);
  }

  if (messageFilled.content.startsWith(`${triggerCommand.rp} `)) {
    const [title, ...args] = rpParseCommand(messageFilled.content);
    return rpSendPollMessage(
      databaseRef,
      psqlClient,
      messageFilled.channel,
      messageFilled.id,
      title,
      args
    );
  }

  if (messageFilled.content.startsWith(`${triggerCommand.rp30} `)) {
    const res = convertRp30ArgToRpArgs(
      removeCommandPrefix(messageFilled.content, triggerCommand.rp30)
    );

    if (Result.isErr(res)) return res;

    return rpSendPollMessage(
      databaseRef,
      psqlClient,
      messageFilled.channel,
      messageFilled.id,
      res.value.title,
      res.value.args
    );
  }

  if (messageFilled.content.startsWith(`${triggerCommand.rp60} `)) {
    const res = convertRp60ArgToRpArgs(
      removeCommandPrefix(messageFilled.content, triggerCommand.rp60)
    );

    if (Result.isErr(res)) return res;

    return rpSendPollMessage(
      databaseRef,
      psqlClient,
      messageFilled.channel,
      messageFilled.id,
      res.value.title,
      res.value.args
    );
  }

  return Result.ok(undefined);
};
