import { IRecord } from '../utils/immutable';
import {
  createIAnswerOfDate,
  fillAnswerOfDate,
  IAnswerOfDate,
  PartialAnswerOfDateJs,
} from './answer-of-date';
import { DateOptionId } from './types';

type AnswerBaseType = Readonly<{
  dateOptionId: DateOptionId;
  answers: IAnswerOfDate;
}>;

export type PartialAnswerJs = Partial<
  Readonly<{
    dateOptionId: DateOptionId;
    answers: PartialAnswerOfDateJs;
  }>
>;

export type IAnswer = IRecord<AnswerBaseType> & Readonly<AnswerBaseType>;

const IAnswerRecordFactory = IRecord<AnswerBaseType>({
  dateOptionId: '' as DateOptionId,
  answers: createIAnswerOfDate(),
});

export const createIAnswer: (
  a?: AnswerBaseType
) => IAnswer = IAnswerRecordFactory;

const d = IAnswerRecordFactory();
export const fillAnswer = (p?: PartialAnswerJs): IAnswer =>
  createIAnswer({
    dateOptionId: p?.dateOptionId ?? d.dateOptionId,
    answers: fillAnswerOfDate(p?.answers) ?? d.answers,
  });
