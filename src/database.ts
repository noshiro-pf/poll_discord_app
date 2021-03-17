import fs from 'fs';
import util from 'util';
import { paths } from './constants';
import { isDev } from './env';
import { IAnswerOfDate } from './types/answer-of-date';
import { createIDatabase, fillDatabase, IDatabase } from './types/database';
import { IPoll } from './types/poll';
import {
  AnswerType,
  DatabaseRef,
  DateOptionId,
  Timestamp,
  UserId,
} from './types/types';

export const initializeDatabase = async (ref: DatabaseRef): Promise<void> => {
  ref.db = await readDatabaseFromJsonFile();
};

export const addPoll = (ref: DatabaseRef, poll: IPoll): Promise<void> =>
  setDatabase(
    ref,
    ref.db
      .update('polls', (polls) => polls.set(poll.id, poll))
      .update('dateToPollIdMap', (dateToPollIdMap) =>
        dateToPollIdMap.withMutations((draft) => {
          poll.dateOptions.forEach((d) => {
            draft.set(d.id, poll.id);
          });
        })
      )
  );

export const updateVote = async (
  ref: DatabaseRef,
  dateOptionId: DateOptionId,
  userId: UserId,
  action: { type: 'add' | 'remove'; value: AnswerType }
): Promise<IPoll | undefined> => {
  const pollId = ref.db.dateToPollIdMap.get(dateOptionId);
  if (pollId === undefined) return;

  const curr = ref.db.polls.get(pollId);
  if (curr === undefined) return;

  const next = curr
    .set('updatedAt', Date.now() as Timestamp)
    .update('answers', (answers) =>
      answers.update(
        dateOptionId,
        (answerOfDate): IAnswerOfDate => {
          switch (action.type) {
            case 'add':
              return answerOfDate.update(action.value, (list) =>
                list.push(userId)
              );
            case 'remove': {
              const idx = answerOfDate
                .get(action.value)
                .findIndex((v) => v === userId);
              if (idx >= 0) {
                return answerOfDate.update(action.value, (list) =>
                  list.remove(idx)
                );
              }
              break;
            }
          }
          return answerOfDate;
        }
      )
    );

  await setDatabase(
    ref,
    ref.db.update('polls', (polls) => polls.set(pollId, next))
  );
  return next;
};

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const readDatabaseFromJsonFile = async (): Promise<IDatabase> => {
  const res = await readFileAsync(paths.dbJson, { encoding: 'utf-8' });
  return databaseFromJson(JSON.parse(res));
};

const writeDatabaseToJsonFile = (database: IDatabase): Promise<void> =>
  writeFileAsync(
    paths.dbJson,
    JSON.stringify(database.toJS(), undefined, isDev ? '  ' : undefined)
  );

const databaseFromJson = (dbJson: unknown): IDatabase => {
  if (typeof dbJson !== 'object' || dbJson === null) {
    return createIDatabase();
  }
  return fillDatabase(dbJson);
};

const setDatabase = (ref: DatabaseRef, next: IDatabase): Promise<void> => {
  ref.db = next;
  return writeDatabaseToJsonFile(next);
};
