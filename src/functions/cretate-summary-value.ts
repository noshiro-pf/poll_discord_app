import { isNotUndefined } from '@noshiro/ts-utils';
import { EmbedFieldData } from 'discord.js';
import { emojis } from '../constants';
import { IAnswerOfDate } from '../types/answer-of-date';
import { IDateOption } from '../types/date-option';
import { IPoll } from '../types/poll';
import { AnswerType, UserId } from '../types/types';
import { ISet } from '../utils/immutable';
import { userIdToMension } from './user-id-to-mension';

export const createSummaryField = (
  dateOption: IDateOption,
  poll: IPoll
): EmbedFieldData => {
  const answerOfDate = poll.answers.get(dateOption.id);
  if (answerOfDate === undefined) {
    return { name: dateOption.label, value: toUserListString(ISet()) };
  }
  if (
    answerOfDate.ok.size + answerOfDate.neither.size + answerOfDate.ng.size ===
    0
  ) {
    return { name: dateOption.label, value: toUserListString(ISet()) };
  }
  return createSummaryFieldFull(dateOption.label, answerOfDate);
};

const createSummaryFieldFull = (
  name: string,
  answerOfDate: IAnswerOfDate
): EmbedFieldData => ({
  name,
  value: createSummaryValue(answerOfDate),
});

export const createSummaryValue = (value: IAnswerOfDate): string =>
  [
    value.ok.size === 0 ? undefined : createSummaryValueElement(value.ok, 'ok'),
    value.neither.size === 0
      ? undefined
      : createSummaryValueElement(value.neither, 'neither'),
    value.ng.size === 0 ? undefined : createSummaryValueElement(value.ng, 'ng'),
  ]
    .filter(isNotUndefined)
    .join('\r\n');

export const createSummaryValueElement = (
  reactions: ISet<UserId>,
  answerType: AnswerType
): string => `${emojis[answerType].name} :${toUserListString(reactions)}`;

const toUserListString = (reactions: ISet<UserId>): string =>
  `\t(${reactions.size})\t${reactions
    .map(userIdToMension)
    .join(', ')}`.trimEnd();
