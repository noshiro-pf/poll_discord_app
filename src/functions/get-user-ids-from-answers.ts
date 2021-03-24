import { IPoll } from '../types/poll';
import { UserId } from '../types/types';
import { ISet } from '../utils/immutable';

export const getUserIdsFromAnswers = (
  answers: IPoll['answers']
): ISet<UserId> =>
  answers.reduce(
    (acc, curr) => acc.union(curr.ok, curr.ng, curr.neither),
    ISet<UserId>()
  );
