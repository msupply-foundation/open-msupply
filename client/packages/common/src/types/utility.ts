import { RecordWithId } from './index';

export type ObjectWithStringKeys = Record<string, unknown>;

export type RecordPatch<T extends RecordWithId> = Partial<T> & { id: string };
