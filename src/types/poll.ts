import {
  assertType,
  IMap,
  mapNullable,
  pipe,
  recordEntries,
  recordFromEntries,
} from '@noshiro/ts-utils';
import type {
  AnswerOfDate,
  AnswerOfDateJson,
  PartialAnswerOfDateJson,
} from './answer-of-date';
import { answerOfDateToJson, fillAnswerOfDate } from './answer-of-date';
import type { DateOption, PartialDateOption } from './date-option';
import { fillDateOption } from './date-option';
import type { DateOptionId, PollId, Timestamp, TitleMessageId } from './types';
import {
  createDateOptionId,
  createPollId,
  createTimestamp,
  createTitleMessageId,
} from './types';

export type Poll = DeepReadonly<{
  id: PollId;
  title: string;
  updatedAt: Timestamp; // timestamp
  dateOptions: DateOption[]; // used to find this Poll object from button message that represents date option
  answers: IMap<DateOptionId, AnswerOfDate>;
  titleMessageId: TitleMessageId;
}>;

export type PollJson = DeepReadonly<{
  id: string;
  title: string;
  updatedAt: Timestamp;
  dateOptions: DateOption[];
  answers: Record<DateOptionId, AnswerOfDateJson>;
  titleMessageId: TitleMessageId;
}>;

assertType<TypeExtends<PollJson, JSONType>>();

export type PartialPollJson = Partial<
  DeepReadonly<{
    id: PollId;
    title: string;
    updatedAt: Timestamp;
    dateOptions: PartialDateOption[];
    answers: Record<DateOptionId, PartialAnswerOfDateJson>;
    titleMessageId: TitleMessageId;
  }>
>;

const defaultPoll: Poll = {
  id: createPollId(''),
  title: '',
  updatedAt: createTimestamp(Date.now()),
  dateOptions: [],
  answers: IMap.new<DateOptionId, AnswerOfDate>([]),
  titleMessageId: createTitleMessageId(''),
} as const;

const d = defaultPoll;
export const fillPoll = (p?: PartialPollJson): Poll => ({
  id: p?.id ?? d.id,
  title: p?.title ?? d.title,
  updatedAt: p?.updatedAt ?? d.updatedAt,
  dateOptions:
    pipe(p?.dateOptions).chain((v) =>
      mapNullable(v, (a) => a.map(fillDateOption))
    ).value ?? d.dateOptions,
  answers:
    pipe(p?.answers)
      .chain((v) => mapNullable(v, recordEntries))
      .chain((a) =>
        mapNullable(a, (entries) =>
          IMap.new<DateOptionId, AnswerOfDate>(
            entries.map(([k, v]) => [
              createDateOptionId(k),
              fillAnswerOfDate(v),
            ])
          )
        )
      ).value ?? d.answers,
  titleMessageId: p?.titleMessageId ?? d.titleMessageId,
});

export const pollToJson = (p: Poll): PollJson => ({
  id: p.id,
  title: p.title,
  updatedAt: p.updatedAt,
  dateOptions: p.dateOptions,
  answers: recordFromEntries(
    p.answers.map(answerOfDateToJson).toEntriesArray()
  ),
  titleMessageId: p.titleMessageId,
});
