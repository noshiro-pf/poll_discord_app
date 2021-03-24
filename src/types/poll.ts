import {
  mapNullable,
  pipeClass as pipe,
  recordEntries,
} from '@noshiro/ts-utils';
import { IList, IMap, IRecord } from '../utils/immutable';
import {
  fillAnswerOfDate,
  IAnswerOfDate,
  PartialAnswerOfDateJs,
} from './answer-of-date';
import {
  fillDateOption,
  IDateOption,
  PartialDateOptionJs,
} from './date-option';
import { DateOptionId, PollId, Timestamp, TitleMessageId } from './types';

type PollBaseType = Readonly<{
  id: PollId;
  title: string;
  updatedAt: Timestamp; // timestamp
  dateOptions: IList<IDateOption>; // used to find this Poll object from button message that represents date option
  answers: IMap<DateOptionId, IAnswerOfDate>;
  titleMessageId: TitleMessageId;
}>;

export type PartialPollJs = Partial<
  Readonly<{
    id: PollId;
    title: string;
    updatedAt: Timestamp;
    dateOptions: readonly PartialDateOptionJs[];
    answers: Record<DateOptionId, PartialAnswerOfDateJs>;
    titleMessageId: TitleMessageId;
  }>
>;

export type IPoll = IRecord<PollBaseType> & Readonly<PollBaseType>;

const IPollRecordFactory = IRecord<PollBaseType>({
  id: '' as PollId,
  title: '',
  updatedAt: Date.now() as Timestamp,
  dateOptions: IList<IDateOption>(),
  answers: IMap<DateOptionId, IAnswerOfDate>(),
  titleMessageId: '' as TitleMessageId,
});

export const createIPoll: (a?: PollBaseType) => IPoll = IPollRecordFactory;

const d = IPollRecordFactory();
export const fillIPoll = (p?: PartialPollJs): IPoll =>
  createIPoll({
    id: p?.id ?? d.id,
    title: p?.title ?? d.title,
    updatedAt: p?.updatedAt ?? d.updatedAt,
    dateOptions:
      pipe(p?.dateOptions).map(mapNullable((a) => IList(a.map(fillDateOption))))
        .value ?? d.dateOptions,
    answers:
      pipe(p?.answers)
        .map(mapNullable(recordEntries))
        .map(
          mapNullable((entries) =>
            IMap<DateOptionId, IAnswerOfDate>(
              entries.map(([k, v]) => [k, fillAnswerOfDate(v)])
            )
          )
        ).value ?? d.answers,
    titleMessageId: p?.titleMessageId ?? d.titleMessageId,
  });
