import { PropsWithChildren } from 'react';

export type ObjectWithStringKeys = Record<string, unknown>;

// Easy to use when you know the object always has an ID.
export type RecordWithId = { id: string };

// Type to use when creating 'update' functions for a record which
// is guaranteed to have an ID. Replace Partial<T> with RecordPatch<T>
// when updating a record in an array.
export type RecordPatch<T extends RecordWithId> = Partial<T> & { id: string };

// Makes specific fields of a record optional. Useful when creating a new type
// that will be a subset of the original.
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type alias for UUIDs
export type UUID = string;

export type PropsWithChildrenOnly = PropsWithChildren<unknown>;
