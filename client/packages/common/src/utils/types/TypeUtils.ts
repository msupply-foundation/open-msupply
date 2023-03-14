export const TypeUtils = {
  isTypeOf: <T extends object>(
    variableToCheck: unknown,
    field: string
  ): variableToCheck is T => field in (variableToCheck as T),
};

export const noOtherVariants = (variant: never): never => {
  throw new Error(`Should never match this variant: ${variant}`);
};

export const getLinesFromRow = <T extends object>(row: T | { lines: T[] }) =>
  'lines' in row ? row.lines : [row];

/*
  When catching a thrown error the error type being caught is `unknown`
  this utility method will either extract .message part of a standard Error type
  or Stringify the whole error, usage:
  try {
    // .. operation that may throw
  } catch (e) {
    console.log(getErrorMessage(e))
  }
*/
export const getErrorMessage = (error: unknown): string => {
  // Bugsnag it ?
  if (error instanceof Error) return error.message;
  return String(error);
};
