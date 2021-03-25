import { Guild, GuildMember, User, UserManager } from 'discord.js';
import { UserId } from '../types/types';
import { IMap, ISet } from '../utils/immutable';
import { quoteIfSpaceIncluded } from './quote-if-space-included';

export const createUserIdToDisplayNameMap = async ({
  userIds,
  userManager,
  guild,
}: {
  userIds: ISet<UserId>;
  userManager: UserManager;
  guild: Guild | undefined;
}): Promise<IMap<UserId, string>> => {
  const displayNameList: readonly {
    userId: UserId;
    displayName: string;
  }[] = await Promise.all(
    userIds
      .map((userId) => userIdToDisplayName({ userId, userManager, guild }))
      .toArray()
  );

  return IMap<UserId, string>(
    displayNameList.map(({ userId, displayName }) => [userId, displayName])
  );
};

const userIdToDisplayName = async ({
  userId,
  userManager,
  guild,
}: {
  userId: UserId;
  userManager: UserManager;
  guild: Guild | undefined;
}): Promise<{ userId: UserId; displayName: string }> => {
  const user: User = await userManager.fetch(userId);
  const guildMember: GuildMember | undefined = await (guild
    ?.fetch()
    .then((g) => g.member(user)?.fetch(true)) ?? Promise.resolve(undefined));

  const displayName = quoteIfSpaceIncluded(
    guildMember?.displayName ?? user.username
  );
  return { userId, displayName };
};
