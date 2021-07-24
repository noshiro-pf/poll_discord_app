import type { DeepReadonly, JsonType, TypeExtends } from '@noshiro/ts-utils';
import { assertType, ISet, mapNullable, pipe } from '@noshiro/ts-utils';
import type { UserId } from './types';

export type AnswerOfDate = Readonly<{
  ok: ISet<UserId>;
  ng: ISet<UserId>;
  neither: ISet<UserId>;
}>;

export type AnswerOfDateJson = DeepReadonly<{
  ok: string[];
  ng: string[];
  neither: string[];
}>;

assertType<TypeExtends<AnswerOfDateJson, JsonType>>();

export type PartialAnswerOfDateJson = Partial<
  DeepReadonly<{
    ok: UserId[];
    ng: UserId[];
    neither: UserId[];
  }>
>;

export const defaultAnswerOfDate: AnswerOfDate = {
  ok: ISet.new<UserId>([]),
  ng: ISet.new<UserId>([]),
  neither: ISet.new<UserId>([]),
} as const;

const d = defaultAnswerOfDate;
export const fillAnswerOfDate = (
  p?: PartialAnswerOfDateJson
): AnswerOfDate => ({
  ok: pipe(p?.ok).chain((v) => mapNullable(v, ISet.new)).value ?? d.ok,
  ng: pipe(p?.ng).chain((v) => mapNullable(v, ISet.new)).value ?? d.ng,
  neither:
    pipe(p?.neither).chain((v) => mapNullable(v, ISet.new)).value ?? d.neither,
});

export const answerOfDateToJson = (a: AnswerOfDate): AnswerOfDateJson => ({
  ok: a.ok.toArray(),
  ng: a.ng.toArray(),
  neither: a.neither.toArray(),
});
