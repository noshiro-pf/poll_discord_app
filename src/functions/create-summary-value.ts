import type { IMap } from '@noshiro/ts-utils';
import { IList, ISet, isNotUndefined } from '@noshiro/ts-utils';
import type { EmbedFieldData } from 'discord.js';
import { emojis } from '../constants';
import type { AnswerOfDate } from '../types/answer-of-date';
import type { DateOption } from '../types/date-option';
import type { Group } from '../types/group';
import type { Poll } from '../types/poll';
import type { AnswerType, UserId } from '../types/types';
import { userIdToMention } from './user-id-to-mention';

export const rpCreateSummaryField = (
  dateOption: DateOption,
  poll: Poll,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData => {
  const answerOfDate = poll.answers.get(dateOption.id);
  if (answerOfDate === undefined) {
    return rpFormatEmbedFieldData(
      dateOption.label,
      rpToUserListString(ISet.new<UserId>([]), userIdToDisplayName)
    );
  }
  if (
    answerOfDate.ok.size + answerOfDate.neither.size + answerOfDate.ng.size ===
    0
  ) {
    return rpFormatEmbedFieldData(
      dateOption.label,
      rpToUserListString(ISet.new<UserId>([]), userIdToDisplayName)
    );
  }

  return rpCreateSummaryFieldSub(
    dateOption.label,
    answerOfDate,
    userIdToDisplayName
  );
};

const rpFormatEmbedFieldData = (
  pollName: string,
  value: string
): EmbedFieldData => ({
  name: `**${pollName}**`,
  value,
});

const rpCreateSummaryFieldSub = (
  pollName: string,
  answerOfDate: AnswerOfDate,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData =>
  rpFormatEmbedFieldData(
    pollName,
    rpCreateSummaryValue(answerOfDate, userIdToDisplayName)
  );

export const rpCreateSummaryValue = (
  value: AnswerOfDate,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  [
    value.ok.size === 0
      ? undefined
      : rpCreateSummaryValueElement(value.ok, 'ok', userIdToDisplayName),
    value.neither.size === 0
      ? undefined
      : rpCreateSummaryValueElement(
          value.neither,
          'neither',
          userIdToDisplayName
        ),
    value.ng.size === 0
      ? undefined
      : rpCreateSummaryValueElement(value.ng, 'ng', userIdToDisplayName),
  ]
    .filter(isNotUndefined)
    .join('\r\n');

export const rpCreateSummaryValueElement = (
  reactions: ISet<UserId>,
  answerType: AnswerType,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  `${emojis[answerType].name} :${rpToUserListString(
    reactions,
    userIdToDisplayName
  )}`;

const rpToUserListString = (
  reactions: ISet<UserId>,
  userIdToDisplayName: IMap<UserId, string>
): string =>
  `\t(${reactions.size})\t${IList.sort(reactions.toArray(), (a, b) =>
    a.localeCompare(b)
  )
    .map((id) => userIdToDisplayName.get(id) ?? userIdToMention(id))
    .join(', ')}`.trimEnd();

export const gpCreateSummaryField = (group: Group): EmbedFieldData =>
  gpFormatEmbedFieldData(group.no, group.nameList.join(', '));

const gpFormatEmbedFieldData = (
  groupName: string,
  value: string
): EmbedFieldData => ({
  name: `**${groupName}**`,
  value,
});
