export const log = (
  value: ReadonlyJSONValue,
  prettyPrint: boolean = true
): void => {
  console.log(JSON.stringify(value, undefined, prettyPrint ? 2 : undefined));
};
