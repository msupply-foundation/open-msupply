// See below for NullableUpdate explanation:
// https://github.com/msupply-foundation/open-msupply/blob/9418199b307699f21c719351730914e7bcd01df9/server/graphql/core/src/generic_inputs.rs#L11
export const setNullableInput = <NODE, KEY extends keyof NODE>(
  key: KEY,
  entity?: NODE | null | undefined
) => {
  if (entity == null) return { value: undefined };

  if (!entity) return undefined;

  return { value: entity[key] };
};
