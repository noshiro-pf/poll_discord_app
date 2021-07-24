import type { DeepReadonly, JsonType, TypeExtends } from '@noshiro/ts-utils';
import {
  assertType,
  IMap,
  isNotUndefined,
  ituple,
  mapNullable,
  pipe,
  recordEntries,
  recordFromEntries,
} from '@noshiro/ts-utils';
import type { PartialPollJson, Poll, PollJson } from './poll';
import { fillPoll, pollToJson } from './poll';
import type { CommandMessageId, DateOptionId, PollId } from './types';
import {
  createCommandMessageId,
  createDateOptionId,
  createPollId,
} from './types';

export type Database = Readonly<{
  polls: IMap<PollId, Poll>;
  dateToPollIdMap: IMap<DateOptionId, PollId>;
  commandMessageIdToPollIdMap: IMap<CommandMessageId, PollId>;
}>;

export type DatabaseJson = DeepReadonly<{
  polls: Record<PollId, PollJson>;
  dateToPollIdMap: Record<DateOptionId, PollId>;
  commandMessageIdToPollIdMap: Record<CommandMessageId, PollId>;
}>;

assertType<TypeExtends<DatabaseJson, JsonType>>();

export type PartialDatabaseJson = Partial<
  Readonly<{
    polls: Record<PollId, PartialPollJson>;
    dateToPollIdMap: Partial<Record<DateOptionId, PollId>>;
    commandMessageIdToPollIdMap: Partial<Record<CommandMessageId, PollId>>;
  }>
>;

export const defaultDatabase: Database = {
  polls: IMap.new<PollId, Poll>([]),
  dateToPollIdMap: IMap.new<DateOptionId, PollId>([]),
  commandMessageIdToPollIdMap: IMap.new<CommandMessageId, PollId>([]),
} as const;

const d = defaultDatabase;
export const fillDatabase = (p?: PartialDatabaseJson): Database => ({
  polls:
    pipe(p?.polls)
      .chain((polls) => mapNullable(polls, recordEntries))
      .chain((entries) =>
        mapNullable(entries, (e) =>
          IMap.new<PollId, Poll>(
            e.map(([k, v]) => [createPollId(k), fillPoll(v)])
          )
        )
      ).value ?? d.polls,
  dateToPollIdMap:
    pipe(p?.dateToPollIdMap)
      .chain((a) => mapNullable(a, recordEntries))
      .chain((a) =>
        mapNullable(a, (entries) =>
          entries
            .filter(
              (
                entry
              ): entry is [typeof entry[0], NonNullable<typeof entry[1]>] =>
                isNotUndefined(entry[1])
            )
            .map(([k, v]) => ituple(createDateOptionId(k), v))
        )
      )
      .chain((a) =>
        mapNullable(a, (entries) => IMap.new<DateOptionId, PollId>(entries))
      ).value ?? d.dateToPollIdMap,
  commandMessageIdToPollIdMap:
    pipe(p?.commandMessageIdToPollIdMap)
      .chain((a) => mapNullable(a, recordEntries))
      .chain((a) =>
        mapNullable(a, (entries) =>
          entries
            .filter(
              (
                entry
              ): entry is [typeof entry[0], NonNullable<typeof entry[1]>] =>
                isNotUndefined(entry[1])
            )
            .map(([k, v]) => ituple(createCommandMessageId(k), v))
        )
      )
      .chain((a) =>
        mapNullable(a, (entries) => IMap.new<CommandMessageId, PollId>(entries))
      ).value ?? d.commandMessageIdToPollIdMap,
});

export const databaseToJson = (database: Database): DatabaseJson => ({
  polls: recordFromEntries(database.polls.map(pollToJson).toEntriesArray()),
  dateToPollIdMap: recordFromEntries(database.dateToPollIdMap.toEntriesArray()),
  commandMessageIdToPollIdMap: recordFromEntries(
    database.commandMessageIdToPollIdMap.toEntriesArray()
  ),
});
