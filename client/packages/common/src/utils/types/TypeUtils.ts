export const TypeUtils = {
  isTypeOf: <T>(
    variableToCheck: unknown,
    field: string
  ): variableToCheck is T => field in (variableToCheck as T),
};

export const noOtherVariants = (variant: never): never => {
  throw new Error(`Should never match this variant: ${variant}`);
};

export const getLinesFromRow = <T extends object>(
  row: T | ({ lines: T[] })
) => ('lines' in row) ? row.lines : [row];
