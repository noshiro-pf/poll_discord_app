import { emojis } from './constants';
import { IAnswerOfDate } from './types/answer-of-date';
import { userIdToMension } from './userid-to-mension';

export const createSummaryValue = (value: IAnswerOfDate): string =>
  [
    `\t${emojis.ok.name} :\t ${value.ok.map(userIdToMension).join(', ')}`,
    `\t${emojis.neither.name} :\t ${value.neither
      .map(userIdToMension)
      .join(', ')}`,
    `\t${emojis.ng.name} :\t ${value.ng.map(userIdToMension).join(', ')}`,
  ].join('\n');
