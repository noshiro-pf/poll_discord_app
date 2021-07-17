import type { JsonType, Phantomic } from '@noshiro/ts-utils';
import type { psqlRowType } from '../constants';
import type { Database } from './database';

export type PollId = Phantomic<string, 'poll-id'>;
export const createPollId = (id: string): PollId => id as PollId;

export type DateOptionId = Phantomic<string, 'date-option-id'>;
export const createDateOptionId = (id: string): DateOptionId =>
  id as DateOptionId;

export type CommandMessageId = Phantomic<string, 'command-message-id'>;
export const createCommandMessageId = (id: string): CommandMessageId =>
  id as CommandMessageId;

export type TitleMessageId = Phantomic<string, 'title-message-id'>;
export const createTitleMessageId = (id: string): TitleMessageId =>
  id as TitleMessageId;

export type UserId = Phantomic<string, 'user-id'>;
export const createUserId = (id: string): UserId => id as UserId;

export type Timestamp = Phantomic<number, 'timestamp'>;
export const createTimestamp = (id: number): Timestamp => id as Timestamp;

export type AnswerType = 'neither' | 'ng' | 'ok';

export type DatabaseRef = { db: Database };

export type PsqlRow = {
  [psqlRowType.id]: string;
  [psqlRowType.data]: JsonType;
  [psqlRowType.updated_at]: string;
};
