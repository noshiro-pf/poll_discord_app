import { IList, pipe, Result } from '@noshiro/ts-utils';
import { rp3060ParseCommand } from './parse-command';

/** @description ショートカットコマンド `/rp60` の引数を /rp コマンドの引数に変換する */
export const convertRp60ArgToRpArgs = (
  commandArguments: string
): Result<
  DeepReadonly<{
    title: string | undefined;
    args: string[];
  }>,
  string
> => {
  const res = rp3060ParseCommand(commandArguments, 'convertRp60ArgsToRpArgs');

  if (Result.isErr(res)) return res;

  const [title, arg1AsNumber, arg2AsNumber] = res.value;

  const argsConverted: readonly string[] = pipe(
    IList.rangeThrow(arg1AsNumber, arg2AsNumber)
  ).chain((list) =>
    IList.map(list, (hour: number) => `${hour}:00-${hour + 1}:00`)
  ).value;

  return Result.ok({ title, args: argsConverted });
};

/** @description ショートカットコマンド `/rp30` の引数を /rp コマンドの引数に変換する */
export const convertRp30ArgToRpArgs = (
  commandArguments: string
): Result<
  Readonly<{ title: string | undefined; args: readonly string[] }>,
  string
> => {
  const res = rp3060ParseCommand(commandArguments, 'convertRp30ArgsToRpArgs');

  if (Result.isErr(res)) return res;

  const [title, arg1AsNumber, arg2AsNumber] = res.value;

  const argsConverted: readonly string[] = pipe(
    IList.rangeThrow(arg1AsNumber, arg2AsNumber)
  ).chain((list) =>
    IList.flatMap(list, (hour: number) => [
      `${hour}:00-${hour}:30`,
      `${hour}:30-${hour + 1}:00`,
    ])
  ).value;

  return Result.ok({ title, args: argsConverted });
};
