import { ItemLike } from './types';
import { ItemRowFragment } from './api';

export const toItemRow = (line: ItemLike): ItemRowFragment => ({
  __typename: 'ItemNode',
  id: ('lines' in line ? line.lines[0]?.item.id : line.item.id) || '',
  name: ('lines' in line ? line.lines[0]?.item.name : line.item.name) || '',
  code: ('lines' in line ? line.lines[0]?.item.code : line.item.code) || '',
  unitName:
    ('lines' in line ? line.lines[0]?.item?.unitName : line.item?.unitName) ??
    '',
});
