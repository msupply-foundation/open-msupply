// Compile-time exhaustiveness for discriminated unions: call in the default arm
// of a switch. If a new variant is added, the narrowed type is no longer `never`
// and the call stops compiling at exactly the switch that needs updating.
export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
};
