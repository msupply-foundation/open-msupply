import { ObjectWithStringKeys } from './utility';

export * from './utility';

type RecordWithId = { id: string };

export interface DomainObject extends RecordWithId, ObjectWithStringKeys {}

export interface Item extends DomainObject {
  id: string;
  code: string;
  name: string;
  packSize?: number;
  quantity: number;
  setQuantity: (row: number, newQuantity: number) => void;
}

export interface Transaction extends DomainObject {
  id: string;
  color: string;
  comment: string;
  status: string;
  type: string;
  entered: string;
  confirmed: string;
  invoiceNumber: string;
  total: string;
  name: string;
  items?: Item[];
}

export type Test = {
  id: number;
  message: string;
};

export type User = {
  id: string;
  name: string;
};

export type Store = {
  id: string;
  name: string;
};
