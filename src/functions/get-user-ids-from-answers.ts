import { ISet } from '@noshiro/ts-utils';
import type { Poll } from '../types/poll';
import type { UserId } from '../types/types';

export const getUserIdsFromAnswers = (answers: Poll['answers']): ISet<UserId> =>
  ISet.new<UserId>([]).withMutations(
    answers
      .toValuesArray()
      .flatMap((v) => [
        ...v.ok.map((id) => ({ type: 'add' as const, key: id })),
        ...v.ng.map((id) => ({ type: 'add' as const, key: id })),
        ...v.neither.map((id) => ({ type: 'add' as const, key: id })),
      ])
  );
