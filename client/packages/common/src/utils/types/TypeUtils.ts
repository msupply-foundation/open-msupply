export const TypeUtils = {
  isTypeOf: <T>(
    variableToCheck: unknown,
    field: string
  ): variableToCheck is T => field in (variableToCheck as T),
};
