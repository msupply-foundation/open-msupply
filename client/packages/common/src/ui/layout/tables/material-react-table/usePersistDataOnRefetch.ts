/**
 *
 */

import { useEffect, useRef } from 'react';
import { MRT_RowData } from 'material-react-table';

export const usePersistDataOnRefetch = <T extends MRT_RowData>(
  data: T[] = [],
  isLoading: boolean
) => {
  const dataRef = useRef<T[]>(data);

  useEffect(() => {
    if (isLoading) return;

    dataRef.current = data;
  }, [data, isLoading]);

  return isLoading ? dataRef.current : data;
};
