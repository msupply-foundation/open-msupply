// import { NameNode } from './schema';

export * from './utility';
export * from './schema';

type RecordWithId = { id: string };

export type DomainObject = RecordWithId;

// export interface Name extends NameNode {
//   id: string;
//   code: string;
//   name: string;
//   isCustomer: boolean;
//   isSupplier: boolean;
// }

export type Test = {
  id: string;
  message: string;
};

export type User = {
  id: string;
  name: string;
};

export interface Store extends DomainObject {
  id: string;
  code: string;
}
