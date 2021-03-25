import { Collection, GuildMember, Message } from 'discord.js';
import { UserId } from '../types/types';
import { IMap, ISet } from '../utils/immutable';
import { quoteIfSpaceIncluded } from './quote-if-space-included';

export const createUserIdToDisplayNameMap = async ({
  userIds,
  message,
}: {
  userIds: ISet<UserId>;
  message: Message;
}): Promise<IMap<UserId, string>> => {
  const guildMembers:
    | Collection<string, GuildMember>
    | undefined = await message.guild?.fetch().then((g) =>
    g.members.fetch({
      user: userIds.toArray(),
    })
  );

  const displayNameList:
    | {
        userId: UserId;
        displayName: string;
      }[]
    | undefined = guildMembers?.map((u) => ({
    userId: u.id as UserId,
    displayName: quoteIfSpaceIncluded(u.displayName),
  }));

  return IMap<UserId, string>(
    displayNameList?.map(({ userId, displayName }) => [userId, displayName]) ??
      []
  );
};
