import type { IMap } from '@noshiro/ts-utils';
import { IList, ISet, isNotUndefined } from '@noshiro/ts-utils';
import type { EmbedFieldData } from 'discord.js';
import { emojis } from '../constants';
import type { AnswerOfDate } from '../types/answer-of-date';
import type { DateOption } from '../types/date-option';
import type { Poll } from '../types/poll';
import type { AnswerType, UserId } from '../types/types';
import { userIdToMention } from './user-id-to-mention';

export const createSummaryField = (
  dateOption: DateOption,
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData => {
  const answerOfDate = poll.answers.get(dateOption.id);
  if (answerOfDate === undefined) {
    return formatEmbedFieldData(
      dateOption.label,
      toUserListString(ISet.new<UserId>([]), userIdToDisplayName)
    );
  }
  if (
    (answerOfDate.ok.size as number) +
      (answerOfDate.neither.size as number) +
      (answerOfDate.ng.size as number) ===
    0
  ) {
    return formatEmbedFieldData(
      dateOption.label,
      toUserListString(ISet.new<UserId>([]), userIdToDisplayName)
    );
  }

  return createSummaryFieldSub(
    dateOption.label,
    answerOfDate,
    userIdToDisplayName
  );
};

const formatEmbedFieldData = (
  pollName: string,
  value: string
): EmbedFieldData => ({
  name: `**${pollName}**`,
  value,
});

const createSummaryFieldSub = (
  pollName: string,
  answerOfDate: AnswerOfDate,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData =>
  formatEmbedFieldData(
    pollName,
    createSummaryValue(answerOfDate, userIdToDisplayName)
  );

export const createSummaryValue = (
  value: AnswerOfDate,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  [
    value.ok.size === 0
      ? undefined
      : createSummaryValueElement(value.ok, 'ok', userIdToDisplayName),
    value.neither.size === 0
      ? undefined
      : createSummaryValueElement(
          value.neither,
          'neither',
          userIdToDisplayName
        ),
    value.ng.size === 0
      ? undefined
      : createSummaryValueElement(value.ng, 'ng', userIdToDisplayName),
  ]
    .filter(isNotUndefined)
    .join('\r\n');

export const createSummaryValueElement = (
  reactions: ISet<UserId>,
  answerType: AnswerType,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  `${emojis[answerType].name} :${toUserListString(
    reactions,
    userIdToDisplayName
  )}`;

const toUserListString = (
  reactions: ISet<UserId>,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  `\t(${reactions.size})\t${IList.sort(reactions.toArray(), (a, b) =>
    a.localeCompare(b)
  )
    .map((id) => userIdToDisplayName.get(id) ?? userIdToMention(id))
    .join(', ')}`.trimEnd();
