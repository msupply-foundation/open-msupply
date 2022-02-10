import { DomainObject } from './index';

export type ObjectWithStringKeys = Record<string, unknown>;

export type RecordPatch<T extends DomainObject> = Partial<T> & { id: string };
