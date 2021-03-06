import {
  getAlphabets,
  IList,
  isInRange,
  ituple,
  pipe,
} from '@noshiro/ts-utils';
import type { Group, NumGroups } from '../types/group';

export const generateGroups = (
  numGroups: NumGroups,
  nameList: readonly string[]
): readonly Group[] => {
  const nameListWithRand: DeepReadonly<[string, number, number][]> = pipe(
    nameList
  )
    .chain((list) => IList.map(list, (n, i) => ituple(n, i, Math.random())))
    .chain((list) =>
      IList.sort(list, ([_n1, _i1, r1], [_n2, _i2, r2]) => r1 - r2)
    ).value;

  return getAlphabets('upper')
    .filter((_, i) => i < numGroups)
    .map((al, idx) => ({
      no: al,
      nameList: pipe(nameListWithRand)
        .chain((list) =>
          IList.filter(list, (_, i) =>
            isInRange(
              Math.floor(nameList.length * (idx / numGroups)),
              Math.floor(nameList.length * ((idx + 1) / numGroups)) - 1
            )(i)
          )
        )
        .chain((list) => IList.sortBy(list, ([_, i]) => i))
        .chain((list) => IList.map(list, ([n]) => n)).value,
    }));
};
