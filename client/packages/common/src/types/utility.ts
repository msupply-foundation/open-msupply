// This type ensures that the resulting value of a `keyof` is
// a string.
// eslint-disable-next-line @typescript-eslint/ban-types
export type KeyOf<T extends object> = Extract<keyof T, string>;

export type ObjectWithStringKeys = Record<string, unknown>;
