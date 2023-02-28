export const TypeUtils = {
  isTypeOf: <T>(
    variableToCheck: unknown,
    field: string
  ): variableToCheck is T => field in (variableToCheck as T),
};

export const noOtherVariants = (variant: never): never => {
  throw new Error(`Should never match this variant: ${variant}`);
};
