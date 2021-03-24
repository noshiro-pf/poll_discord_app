import { isNotUndefined } from '@noshiro/ts-utils';
import { EmbedFieldData } from 'discord.js';
import { emojis } from '../constants';
import { IAnswerOfDate } from '../types/answer-of-date';
import { IDateOption } from '../types/date-option';
import { IPoll } from '../types/poll';
import { AnswerType, UserId } from '../types/types';
import { IMap, ISet } from '../utils/immutable';
import { userIdToMension } from './user-id-to-mension';

export const createSummaryField = (
  dateOption: IDateOption,
  poll: IPoll,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData => {
  const answerOfDate = poll.answers.get(dateOption.id);
  if (answerOfDate === undefined) {
    return formatEmbedFieldData(
      dateOption.label,
      toUserListString(ISet(), userIdToDisplayName)
    );
  }
  if (
    answerOfDate.ok.size + answerOfDate.neither.size + answerOfDate.ng.size ===
    0
  ) {
    return formatEmbedFieldData(
      dateOption.label,
      toUserListString(ISet(), userIdToDisplayName)
    );
  }
  return createSummaryFieldSub(
    dateOption.label,
    answerOfDate,
    userIdToDisplayName
  );
};

const formatEmbedFieldData = (name: string, value: string): EmbedFieldData => ({
  name: `**${name}**`,
  value,
});

const createSummaryFieldSub = (
  name: string,
  answerOfDate: IAnswerOfDate,
  userIdToDisplayName: IMap<UserId, string>
): EmbedFieldData =>
  formatEmbedFieldData(
    name,
    createSummaryValue(answerOfDate, userIdToDisplayName)
  );

export const createSummaryValue = (
  value: IAnswerOfDate,
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
  `\t(${reactions.size})\t${reactions
    .sort()
    .map((id) => userIdToDisplayName.get(id) ?? userIdToMension(id))
    .join(', ')}`.trimEnd();
