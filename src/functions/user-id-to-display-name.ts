import type { DeepReadonly, ISet, Writable } from '@noshiro/ts-utils';
import { IMap } from '@noshiro/ts-utils';
import type { Collection, GuildMember, Message } from 'discord.js';
import type { UserId } from '../types/types';
import { createUserId } from '../types/types';
import { quoteIfSpaceIncluded } from './quote-if-space-included';

// eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
export const createUserIdToDisplayNameMap = async ({
  userIds,
  message,
}: DeepReadonly<{
  userIds: ISet<UserId>;
  message: Message;
}>): Promise<IMap<UserId, string>> => {
  const userIdList = userIds.toArray();
  const guildMembers: Collection<string, GuildMember> | undefined =
    await message.guild
      ?.fetch()
      .then((g) =>
        g.members.fetch({ user: userIdList as Writable<typeof userIdList> })
      );

  const displayNameList:
    | {
        userId: UserId;
        displayName: string;
      }[]
    | undefined = guildMembers?.map((u) => ({
    userId: createUserId(u.id),
    displayName: quoteIfSpaceIncluded(u.displayName),
  }));

  return IMap.new<UserId, string>(
    displayNameList?.map(({ userId, displayName }) => [userId, displayName]) ??
      []
  );
};
