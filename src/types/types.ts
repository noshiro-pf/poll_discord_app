import { Phantomic } from '@noshiro/ts-utils';
import { IDatabase } from './database';

export type PollId = Phantomic<string, 'poll-id'>;
export type DateOptionId = Phantomic<string, 'date-option-id'>;
export type UserId = Phantomic<string, 'user-id'>;
export type Timestamp = Phantomic<number, 'timestamp'>;

export type AnswerType = 'ok' | 'neither' | 'ng';

export type DatabaseRef = { db: IDatabase };
