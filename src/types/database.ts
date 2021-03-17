import {
  mapNullable,
  pipeClass as pipe,
  recordEntries,
} from '@noshiro/ts-utils';
import { IMap, IRecord } from '../immutable';
import { fillIPoll, IPoll, PartialPollJs } from './poll';
import { DateOptionId, PollId } from './types';

type DatabaseBaseType = Readonly<{
  polls: IMap<PollId, IPoll>;
  dateToPollIdMap: IMap<DateOptionId, PollId>;
}>;

export type PartialDatabaseJs = Partial<
  Readonly<{
    polls: Record<PollId, PartialPollJs>;
    dateToPollIdMap: Record<DateOptionId, PollId>;
  }>
>;

export type IDatabase = IRecord<DatabaseBaseType> & Readonly<DatabaseBaseType>;

const IDatabaseRecordFactory = IRecord<DatabaseBaseType>({
  polls: IMap<PollId, IPoll>(),
  dateToPollIdMap: IMap<DateOptionId, PollId>(),
});

export const createIDatabase: (
  a?: DatabaseBaseType
) => IDatabase = IDatabaseRecordFactory;

const d = IDatabaseRecordFactory();
export const fillDatabase = (p?: PartialDatabaseJs): IDatabase =>
  createIDatabase({
    polls:
      pipe(p?.polls)
        .map(mapNullable(recordEntries))
        .map(
          mapNullable((entries) =>
            IMap<PollId, IPoll>(entries.map(([k, v]) => [k, fillIPoll(v)]))
          )
        ).value ?? d.polls,
    dateToPollIdMap:
      pipe(p?.dateToPollIdMap)
        .map(mapNullable(recordEntries))
        .map(mapNullable((entries) => IMap<DateOptionId, PollId>(entries)))
        .value ?? d.dateToPollIdMap,
  });
