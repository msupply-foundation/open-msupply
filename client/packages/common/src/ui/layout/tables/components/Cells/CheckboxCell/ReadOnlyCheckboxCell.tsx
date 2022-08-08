import React from 'react';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns';
import { CheckboxCell } from './CheckboxCell';

export const ReadOnlyCheckboxCell = <T extends RecordWithId>({
  ...props
}: CellProps<T>): React.ReactElement<CellProps<T>> => (
  <CheckboxCell {...props} isDisabled />
);
