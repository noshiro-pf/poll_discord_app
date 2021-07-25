import { IRecord, pipe, Result } from '@noshiro/ts-utils';
import type { Client as PsqlClient } from 'pg';
import { psqlRowType } from './constants';
import { psql } from './postgre-sql';
import type { AnswerOfDate } from './types/answer-of-date';
import type { Database } from './types/database';
import {
  databaseToJson,
  defaultDatabase,
  fillDatabase,
} from './types/database';
import type { Poll } from './types/poll';
import type {
  AnswerType,
  CommandMessageId,
  DatabaseRef,
  DateOptionId,
  UserId,
} from './types/types';
import { createTimestamp } from './types/types';

export const addPoll = (
  ref: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  poll: Poll,
  messageId: CommandMessageId
): Promise<Result<undefined, unknown>> =>
  setDatabase(
    ref,
    psqlClient,
    pipe(ref.db)
      .chain((db) =>
        IRecord.update(db, 'polls', (polls) => polls.set(poll.id, poll))
      )
      .chain((db) =>
        IRecord.update(db, 'dateToPollIdMap', (dateToPollIdMap) =>
          dateToPollIdMap.withMutations(
            poll.dateOptions.map((d) => ({
              type: 'set',
              key: d.id,
              value: poll.id,
            }))
          )
        )
      )
      .chain((db) =>
        IRecord.update(db, 'commandMessageIdToPollIdMap', (map) =>
          map.set(messageId, poll.id)
        )
      ).value
  );

export const updatePoll = (
  ref: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  poll: Poll
): Promise<Result<undefined, unknown>> =>
  setDatabase(
    ref,
    psqlClient,
    IRecord.update(ref.db, 'polls', (polls) => polls.set(poll.id, poll))
  );

export const getPollByDateId = (
  ref: DatabaseRef,
  dateOptionId: DateOptionId
): Result<Poll, unknown> => {
  const pollId = ref.db.dateToPollIdMap.get(dateOptionId);
  if (pollId === undefined) {
    return Result.err(`pollId for "${dateOptionId}" not found.`);
  }
  const curr = ref.db.polls.get(pollId);
  if (curr === undefined) {
    return Result.err(`poll with id ${pollId} not found.`);
  }

  return Result.ok(curr);
};

export const updateVote = async (
  ref: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  dateOptionId: DateOptionId,
  userId: UserId,
  action: Readonly<{ type: 'add' | 'remove'; value: AnswerType }>
): Promise<Result<Poll, unknown>> => {
  const pollResult = getPollByDateId(ref, dateOptionId);
  if (Result.isErr(pollResult)) return Result.err(undefined);
  const curr = pollResult.value;

  const next = pipe(curr)
    .chain((poll) =>
      IRecord.set(poll, 'updatedAt', createTimestamp(Date.now()))
    )
    .chain((poll) =>
      IRecord.update(poll, 'answers', (answers) =>
        answers.update(dateOptionId, (answerOfDate): AnswerOfDate => {
          switch (action.type) {
            case 'add':
              return IRecord.update(answerOfDate, action.value, (set) =>
                set.add(userId)
              );
            case 'remove': {
              return IRecord.update(answerOfDate, action.value, (set) =>
                set.delete(userId)
              );
            }
          }
        })
      )
    ).value;

  const pollId = curr.id;

  const res = await setDatabase(
    ref,
    psqlClient,
    IRecord.update(ref.db, 'polls', (polls) => polls.set(pollId, next))
  );
  if (Result.isErr(res)) {
    return Result.err(`setDatabase failed. ${JSON.stringify(res.value)}`);
  }
  return Result.ok(next);
};

const databaseFromJson = (dbJson: unknown): Database =>
  typeof dbJson !== 'object' || dbJson === null
    ? defaultDatabase
    : fillDatabase(dbJson);

const setDatabase = (
  ref: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  next: Database
): Promise<Result<undefined, unknown>> => {
  ref.db = next;
  return psql.setJsonData(psqlClient, databaseToJson(next));
};

export const initializeInMemoryDatabase = async (
  ref: DatabaseRef,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient
): Promise<Result<undefined, unknown>> => {
  const res = await psql.getJsonData(psqlClient);
  if (Result.isErr(res)) return res;

  ref.db = databaseFromJson(res.value[psqlRowType.data]);
  return Result.ok(undefined);
};
