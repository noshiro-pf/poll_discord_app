export const parseCommandArgument = (commandArgument: string): string[] =>
  commandArgument.split('"').filter((_, i) => i % 2 === 1);
