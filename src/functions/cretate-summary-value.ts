import { emojis } from '../constants';
import { IAnswerOfDate } from '../types/answer-of-date';
import { AnswerType, UserId } from '../types/types';
import { ISet } from '../utils/immutable';
import { userIdToMension } from './user-id-to-mension';

export const createSummaryValue = (value: IAnswerOfDate): string =>
  [
    createSummaryValueElement(value.ok, 'ok'),
    createSummaryValueElement(value.neither, 'neither'),
    createSummaryValueElement(value.ng, 'ng'),
  ].join('\r\n');

export const createSummaryValueElement = (
  reactions: ISet<UserId>,
  answerType: AnswerType
): string =>
  `${emojis[answerType].name} :\t(${reactions.size})\t${reactions
    .map(userIdToMension)
    .join(', ')}`.trimEnd();
