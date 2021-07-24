import type { JsonType } from '@noshiro/ts-utils';
import type { psqlRowType } from '../constants';
import type { Database } from './database';

export type PollId = string;
export const createPollId = (id: string): PollId => id as PollId;

export type DateOptionId = string;
export const createDateOptionId = (id: string): DateOptionId =>
  id as DateOptionId;

export type CommandMessageId = string;
export const createCommandMessageId = (id: string): CommandMessageId =>
  id as CommandMessageId;

export type TitleMessageId = string;
export const createTitleMessageId = (id: string): TitleMessageId =>
  id as TitleMessageId;

export type UserId = string;
export const createUserId = (id: string): UserId => id as UserId;

export type Timestamp = number;
export const createTimestamp = (id: number): Timestamp => id as Timestamp;

export type AnswerType = 'neither' | 'ng' | 'ok';

export type DatabaseRef = { db: Database };

export type PsqlRow = {
  [psqlRowType.id]: string;
  [psqlRowType.data]: JsonType;
  [psqlRowType.updated_at]: string;
};
