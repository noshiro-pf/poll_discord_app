import { mapNullable, pipeClass as pipe } from '@noshiro/ts-utils';
import { IRecord, ISet } from '../utils/immutable';
import { UserId } from './types';

type AnswerOfDateBaseType = Readonly<{
  ok: ISet<UserId>;
  ng: ISet<UserId>;
  neither: ISet<UserId>;
}>;

export type PartialAnswerOfDateJs = Partial<
  Readonly<{
    ok: readonly UserId[];
    ng: readonly UserId[];
    neither: readonly UserId[];
  }>
>;

export type IAnswerOfDate = IRecord<AnswerOfDateBaseType> &
  Readonly<AnswerOfDateBaseType>;

const IAnswerOfDateRecordFactory = IRecord<AnswerOfDateBaseType>({
  ok: ISet<UserId>(),
  ng: ISet<UserId>(),
  neither: ISet<UserId>(),
});

export const createIAnswerOfDate: (
  a?: AnswerOfDateBaseType
) => IAnswerOfDate = IAnswerOfDateRecordFactory;

const d = IAnswerOfDateRecordFactory();
export const fillAnswerOfDate = (p?: PartialAnswerOfDateJs): IAnswerOfDate =>
  createIAnswerOfDate({
    ok: pipe(p?.ok).map(mapNullable((a) => ISet(a))).value ?? d.ok,
    ng: pipe(p?.ng).map(mapNullable((a) => ISet(a))).value ?? d.ng,
    neither:
      pipe(p?.neither).map(mapNullable((a) => ISet(a))).value ?? d.neither,
  });
