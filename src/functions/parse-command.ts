import type { uint32 } from '@noshiro/ts-utils';
import { Result } from '@noshiro/ts-utils';
import type { NumGroups } from '../types/group';
import { maxNumGroups } from '../types/group';

export const rpParseCommandArgument = (commandArgument: string): string[] =>
  commandArgument
    .split('"')
    .filter((_, i) => i % 2 === 1)
    .map((s) => s.replace('\n', ' ').replace('\t', ' '));

export const gpParseGroupingCommandArgument = (
  commandArguments: string
): Result<[NumGroups, string[]], undefined> => {
  const numGroups = parseInt(commandArguments, 10);
  if (Number.isNaN(numGroups)) return Result.err(undefined);
  if (numGroups < 2 || maxNumGroups < numGroups) return Result.err(undefined);

  return Result.ok([
    numGroups as NumGroups,
    commandArguments
      .split('"')
      .filter((_, i) => i % 2 === 1)
      .map((s) => s.replace('\n', ' ').replace('\t', ' ')),
  ]);
};

export const gpParseRandCommandArgument = (
  commandArguments: string
): Result<uint32, undefined> => {
  const n = parseInt(commandArguments, 10);
  if (Number.isNaN(n)) return Result.err(undefined);
  if (n < 2 || !Number.isSafeInteger(n)) return Result.err(undefined);

  return Result.ok(n as uint32);
};
