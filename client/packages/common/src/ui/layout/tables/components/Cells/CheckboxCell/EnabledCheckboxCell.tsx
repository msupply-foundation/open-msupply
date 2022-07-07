import React from 'react';
import { CellProps } from '../../../columns';
import { RecordWithId } from '@common/types';
import { CheckboxCell } from './CheckboxCell';

export const EnabledCheckboxCell = <T extends RecordWithId>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isDisabled,
  ...props
}: CellProps<T>): React.ReactElement<CellProps<T>> => (
  <CheckboxCell {...props} />
);
