import { useContext, useEffect, useState } from 'react';
import { PluginArea, PluginType } from '../types';
import { PluginContext } from '../components/PluginContext';
import { RecordWithId } from '../../types/utility';
import { ColumnDefinition } from '../../ui';

export function usePluginColumns<T extends RecordWithId>({
  area,
  type,
}: {
  area: PluginArea;
  type: PluginType;
}) {
  const { getPluginColumns } = useContext(PluginContext);
  const [pluginColumns, setPluginColumns] = useState<ColumnDefinition<T>[]>([]);
  const { plugins } = useContext(PluginContext);

  useEffect(() => {
    const setColumns = (
      columns: (ColumnDefinition<RecordWithId> | null)[]
    ): void => {
      setPluginColumns(
        columns
          .filter(
            (column): column is ColumnDefinition<RecordWithId> =>
              column !== null
          )
          .map(column => column as unknown as ColumnDefinition<T>)
      );
    };

    getPluginColumns({ area, type }).then(setColumns);
  }, [plugins]);

  return pluginColumns;
}
