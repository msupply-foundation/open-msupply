import { StockLineNode, ItemNode } from './schema';

export * from './utility';
export * from './schema';
export * from '../operations.generated';

type RecordWithId = { id: string };

export type DomainObject = RecordWithId;

export interface Name extends DomainObject {
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface ItemRow extends DomainObject {
  id: string;
  isVisible: boolean;
  code: string;
  name: string;
  availableQuantity: number;
  unitName?: string;
}

export interface Item extends Omit<ItemNode, 'availableBatches'>, DomainObject {
  id: string;
  isVisible: boolean;
  code: string;
  name: string;
  availableQuantity: number;
  availableBatches: StockLine[];
  unitName: string;
}

export interface StockLine
  extends DomainObject,
    Omit<StockLineNode, '__typename'> {}

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
