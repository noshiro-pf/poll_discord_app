export const quoteIfSpaceIncluded = (str: string): string =>
  /\s/g.test(str) ? `"${str}"` : str;
