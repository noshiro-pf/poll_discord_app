import {
  mapNullable,
  pipeClass as pipe,
  recordEntries,
} from '@noshiro/ts-utils';
import { IMap, IRecord } from '../utils/immutable';
import { fillIPoll, IPoll, PartialPollJs } from './poll';
import { CommandMessageId, DateOptionId, PollId } from './types';

type DatabaseBaseType = Readonly<{
  polls: IMap<PollId, IPoll>;
  dateToPollIdMap: IMap<DateOptionId, PollId>;
  commandMessageIdToPollIdMap: IMap<CommandMessageId, PollId>;
}>;

export type PartialDatabaseJs = Partial<
  Readonly<{
    polls: Record<PollId, PartialPollJs>;
    dateToPollIdMap: Partial<Record<DateOptionId, PollId>>;
    commandMessageIdToPollIdMap: Partial<Record<CommandMessageId, PollId>>;
  }>
>;

export type IDatabase = IRecord<DatabaseBaseType> & Readonly<DatabaseBaseType>;

const IDatabaseRecordFactory = IRecord<DatabaseBaseType>({
  polls: IMap<PollId, IPoll>(),
  dateToPollIdMap: IMap<DateOptionId, PollId>(),
  commandMessageIdToPollIdMap: IMap<CommandMessageId, PollId>(),
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
    commandMessageIdToPollIdMap:
      pipe(p?.commandMessageIdToPollIdMap)
        .map(mapNullable(recordEntries))
        .map(mapNullable((entries) => IMap<CommandMessageId, PollId>(entries)))
        .value ?? d.commandMessageIdToPollIdMap,
  });
