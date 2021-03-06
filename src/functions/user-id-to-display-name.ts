import { IMap, promiseToResult, Result } from '@noshiro/ts-utils';
import type { Collection, Guild, GuildMember } from 'discord.js';
import type { UserId } from '../types/types';
import { createUserId } from '../types/types';
import { quoteIfSpaceIncluded } from './quote-if-space-included';

export const createUserIdToDisplayNameMap = async (
  guild: Guild | null,
  userIds: readonly UserId[] | undefined
): Promise<Result<IMap<UserId, string>, string>> => {
  const guildMembersResult:
    | Result<Collection<string, GuildMember> | undefined, string>
    | undefined = await promiseToResult(
    (userIds === undefined
      ? guild?.members.fetch()
      : guild?.members.fetch({ user: userIds as Writable<typeof userIds> })) ??
      Promise.reject(new Error('guild is undefined'))
  );

  if (Result.isErr(guildMembersResult)) {
    return guildMembersResult;
  }

  const guildMembers = guildMembersResult.value;

  const displayNameList:
    | DeepReadonly<
        {
          userId: UserId;
          displayName: string;
        }[]
      >
    | undefined = guildMembers?.map((u) => ({
    userId: createUserId(u.id),
    displayName: quoteIfSpaceIncluded(u.displayName),
  }));

  return Result.ok(
    IMap.new<UserId, string>(
      displayNameList?.map(({ userId, displayName }) => [
        userId,
        displayName,
      ]) ?? []
    )
  );
};
