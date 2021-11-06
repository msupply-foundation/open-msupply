import { ObjectWithStringKeys } from '@openmsupply-client/common';

export interface ItemRow extends ObjectWithStringKeys {
  id: string;
  code: string;
  name: string;
}
