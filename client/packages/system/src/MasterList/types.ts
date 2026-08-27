import { MasterListNode } from '@openmsupply-client/common';

export interface MasterListRow {
  id: string;
  code: string;
  name: string;
  description: string;
}

export type MasterList = Omit<MasterListNode, '__typename'>;
