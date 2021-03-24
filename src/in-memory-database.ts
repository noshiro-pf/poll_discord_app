import { Result } from '@noshiro/ts-utils';
import { Client as PsqlClient } from 'pg';
import { psqlRowType } from './constants';
import { psql } from './postgre-sql';
import { IAnswerOfDate } from './types/answer-of-date';
import { createIDatabase, fillDatabase, IDatabase } from './types/database';
import { IPoll } from './types/poll';
import {
  AnswerType,
  CommandMessageId,
  DatabaseRef,
  DateOptionId,
  Timestamp,
  UserId,
} from './types/types';

export const addPoll = (
  ref: DatabaseRef,
  psqlClient: PsqlClient,
  poll: IPoll,
  messageId: CommandMessageId
): Promise<Result<undefined, unknown>> =>
  setDatabase(
    ref,
    psqlClient,
    ref.db
      .update('polls', (polls) => polls.set(poll.id, poll))
      .update('dateToPollIdMap', (dateToPollIdMap) =>
        dateToPollIdMap.withMutations((draft) => {
          poll.dateOptions.forEach((d) => {
            draft.set(d.id, poll.id);
          });
        })
      )
      .update('commandMessageIdToPollIdMap', (map) =>
        map.set(messageId, poll.id)
      )
  );

export const updatePoll = (
  ref: DatabaseRef,
  psqlClient: PsqlClient,
  poll: IPoll
): Promise<Result<undefined, unknown>> =>
  setDatabase(
    ref,
    psqlClient,
    ref.db.update('polls', (polls) => polls.set(poll.id, poll))
  );

export const updateVote = async (
  ref: DatabaseRef,
  psqlClient: PsqlClient,
  dateOptionId: DateOptionId,
  userId: UserId,
  action: { type: 'add' | 'remove'; value: AnswerType }
): Promise<Result<IPoll, unknown>> => {
  const pollId = ref.db.dateToPollIdMap.get(dateOptionId);
  if (pollId === undefined)
    return Result.err(`pollId for "${dateOptionId}" not found.`);

  const curr = ref.db.polls.get(pollId);
  if (curr === undefined)
    return Result.err(`poll with id ${pollId} not found.`);

  const next = curr
    .set('updatedAt', Date.now() as Timestamp)
    .update('answers', (answers) =>
      answers.update(
        dateOptionId,
        (answerOfDate): IAnswerOfDate => {
          switch (action.type) {
            case 'add':
              return answerOfDate.update(action.value, (set) =>
                set.add(userId)
              );
            case 'remove': {
              return answerOfDate.update(action.value, (set) =>
                set.remove(userId)
              );
            }
          }
        }
      )
    );

  const res = await setDatabase(
    ref,
    psqlClient,
    ref.db.update('polls', (polls) => polls.set(pollId, next))
  );
  if (Result.isErr(res)) {
    return Result.err(`setDatabase failed. ${JSON.stringify(res.value)}`);
  }
  return Result.ok(next);
};

// const readFileAsync = util.promisify(fs.readFile);
// const writeFileAsync = util.promisify(fs.writeFile);

// const readDatabaseFromJsonFile = async (): Promise<IDatabase> => {
//   const res = await readFileAsync(paths.dbJson, { encoding: 'utf-8' });
//   return databaseFromJson(JSON.parse(res));
// };

// export const writeDatabaseToJsonFile = (database: IDatabase): Promise<void> =>
//   writeFileAsync(
//     paths.dbJson,
//     JSON.stringify(database.toJS(), undefined, isDev ? '  ' : undefined)
//   );

const databaseFromJson = (dbJson: unknown): IDatabase =>
  typeof dbJson !== 'object' || dbJson === null
    ? createIDatabase()
    : fillDatabase(dbJson);

const setDatabase = (
  ref: DatabaseRef,
  psqlClient: PsqlClient,
  next: IDatabase
): Promise<Result<undefined, unknown>> => {
  ref.db = next;
  return psql.setJsonData(psqlClient, next.toJS());
};

export const initializeInMemoryDatabase = async (
  ref: DatabaseRef,
  psqlClient: PsqlClient
): Promise<Result<undefined, unknown>> => {
  const res = await psql.getJsonData(psqlClient);
  if (Result.isErr(res)) return res;
  ref.db = databaseFromJson(res.value[psqlRowType.data]);
  return Result.ok(undefined);
};
