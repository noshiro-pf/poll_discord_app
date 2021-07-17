import type { AnswerOfDate, PartialAnswerOfDateJson } from './answer-of-date';
import { defaultAnswerOfDate, fillAnswerOfDate } from './answer-of-date';
import type { DateOptionId } from './types';
import { createDateOptionId } from './types';

export type Answer = Readonly<{
  dateOptionId: DateOptionId;
  answers: AnswerOfDate;
}>;

type PartialAnswer = Partial<
  Readonly<{
    dateOptionId: DateOptionId;
    answers: PartialAnswerOfDateJson;
  }>
>;

const defaultAnswer: Answer = {
  dateOptionId: createDateOptionId(''),
  answers: defaultAnswerOfDate,
} as const;

const d = defaultAnswer;
export const fillAnswer = (p?: PartialAnswer): Answer => ({
  dateOptionId: p?.dateOptionId ?? d.dateOptionId,
  answers: fillAnswerOfDate(p?.answers) ?? d.answers,
});
