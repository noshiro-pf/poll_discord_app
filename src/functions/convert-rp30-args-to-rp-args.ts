import type { uint32 } from '@noshiro/ts-utils';
import {
  IList,
  isArrayOfLength2OrMore,
  isInRange,
  isUint32,
  pipe,
  range,
  Result,
} from '@noshiro/ts-utils';

const validateArgs = (
  commandArguments: readonly string[],
  functionName: 'convertRp30ArgsToRpArgs' | 'convertRp60ArgsToRpArgs'
): Result<readonly [uint32, uint32], string> => {
  if (!isArrayOfLength2OrMore(commandArguments)) {
    return Result.err(
      [
        `error has occurred in ${functionName}:`,
        'at least 2 arguments should be passed.',
      ].join('')
    );
  }

  const [arg1, arg2] = commandArguments;
  const arg1AsNumber = parseInt(arg1, 10);
  const arg2AsNumber = parseInt(arg2, 10);
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

/** @description ショートカットコマンド `/rp60` の引数を /rp コマンドの引数に変換する */
export const convertRp60ArgsToRpArgs = (
  commandArguments: readonly string[]
): Result<readonly string[], string> => {
  const res = validateArgs(commandArguments, 'convertRp60ArgsToRpArgs');
  if (Result.isErr(res)) return res;
  const [arg1AsNumber, arg2AsNumber] = res.value;

  const argsConverted: readonly string[] = pipe(
    range(arg1AsNumber, arg2AsNumber)
  ).chain((list) =>
    IList.map(list, (hour: number) => `${hour}:00-${hour + 1}:00`)
  ).value;

  return Result.ok(argsConverted);
};

/** @description ショートカットコマンド `/rp30` の引数を /rp コマンドの引数に変換する */
export const convertRp30ArgsToRpArgs = (
  commandArguments: readonly string[]
): Result<readonly string[], string> => {
  const res = validateArgs(commandArguments, 'convertRp30ArgsToRpArgs');
  if (Result.isErr(res)) return res;
  const [arg1AsNumber, arg2AsNumber] = res.value;

  const argsConverted: readonly string[] = pipe(
    range(arg1AsNumber, arg2AsNumber)
  ).chain((list) =>
    IList.flatMap(list, (hour: number) => [
      `${hour}:00-${hour}:30`,
      `${hour}:30-${hour + 1}:00`,
    ])
  ).value;

  return Result.ok(argsConverted);
};
