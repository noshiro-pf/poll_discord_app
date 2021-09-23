import { isInRange, isUint32, isUndefined, Result } from '@noshiro/ts-utils';
import type { NumGroups } from '../types/group';
import { maxNumGroups } from '../types/group';

export const rpParseCommand = (command: string): readonly string[] =>
  command
    .split('"')
    .filter((_, i) => i % 2 === 1)
    .map((s) => s.replace('\n', ' ').replace('\t', ' '));

export const rp3060ParseCommand = (
  commandArguments: string, // "9月4日 (土)" 15  25
  functionName: 'convertRp30ArgsToRpArgs' | 'convertRp60ArgsToRpArgs'
): Result<readonly [string, number, number], string> => {
  const regexResult =
    /\s*"(?<title>.*)"\s+"?(?<begin>[0-9]{1,2})"?\s+"?(?<end>[0-9]{1,2})"?/u.exec(
      commandArguments
    )?.groups;

  const parseErrorMessage = [
    `error has occurred in ${functionName}:`,
    'title and begin/end hour arguments should be passed.',
  ].join('');

  if (isUndefined(regexResult)) {
    return Result.err(parseErrorMessage);
  }

  const { title, begin, end } = regexResult;

  if (isUndefined(title) || isUndefined(begin) || isUndefined(end)) {
    return Result.err(parseErrorMessage);
  }

  const arg1AsNumber = parseInt(begin, 10);
  const arg2AsNumber = parseInt(end, 10);
  const rangeCheckFn = isInRange(0, 30);
  if (
    !isUint32(arg1AsNumber) ||
    !isUint32(arg2AsNumber) ||
    !rangeCheckFn(arg1AsNumber) ||
    !rangeCheckFn(arg2AsNumber)
  ) {
    return Result.err(
      [
        `error has occurred in ${functionName}:`,
        'each argument should be an integer in the range 0 <= x <= 30.',
      ].join('')
    );
  }

  return Result.ok([title, arg1AsNumber, arg2AsNumber] as const);
};

export const rp3060dParseCommand = (
  commandArguments: string, // "9月4日 (土)" 15  25
  functionName: 'convertRp30dArgsToRpArgs' | 'convertRp60dArgsToRpArgs'
): Result<readonly [number, number], string> => {
  const regexResult =
    /\s*"?(?<begin>[0-9]{1,2})"?\s+"?(?<end>[0-9]{1,2})"?/u.exec(
      commandArguments
    )?.groups;

  const parseErrorMessage = [
    `error has occurred in ${functionName}:`,
    'begin/end hour arguments should be passed.',
  ].join('');

  if (isUndefined(regexResult)) {
    return Result.err(parseErrorMessage);
  }

  const { begin, end } = regexResult;

  if (isUndefined(begin) || isUndefined(end)) {
    return Result.err(parseErrorMessage);
  }

  const arg1AsNumber = parseInt(begin, 10);
  const arg2AsNumber = parseInt(end, 10);
  const rangeCheckFn = isInRange(0, 30);
  if (
    !isUint32(arg1AsNumber) ||
    !isUint32(arg2AsNumber) ||
    !rangeCheckFn(arg1AsNumber) ||
    !rangeCheckFn(arg2AsNumber)
  ) {
    return Result.err(
      [
        `error has occurred in ${functionName}:`,
        'each argument should be an integer in the range 0 <= x <= 30.',
      ].join('')
    );
  }

  return Result.ok([arg1AsNumber, arg2AsNumber] as const);
};

export const gpParseGroupingCommandArgument = (
  commandArguments: string
): Result<readonly [NumGroups, readonly string[]], undefined> => {
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
): Result<number, undefined> => {
  const n = parseInt(commandArguments, 10);
  if (Number.isNaN(n)) return Result.err(undefined);
  if (n < 2 || !Number.isSafeInteger(n)) return Result.err(undefined);

  return Result.ok(n);
};
