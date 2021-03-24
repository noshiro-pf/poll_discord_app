import { tuple } from '@noshiro/ts-utils';
import { Guild, User, UserManager } from 'discord.js';
import { UserId } from '../types/types';
import { IMap, ISet } from '../utils/immutable';

export const createUserIdToDisplayNameMap = async ({
  userIds,
  userManager,
  guild,
}: {
  userIds: ISet<UserId>;
  userManager: UserManager;
  guild: Guild | undefined;
}): Promise<IMap<UserId, string>> => {
  const usersFull: readonly User[] = await Promise.all(
    userIds.map((id) => userManager.fetch(id)).toArray()
  );

  const displayNameList: readonly [UserId, string][] = await Promise.all(
    usersFull.map((u) =>
      tuple(u.id as UserId, guild?.member(u)?.nickname ?? u.username)
    )
  );

  return IMap<UserId, string>(displayNameList);
};
