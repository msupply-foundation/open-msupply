import { useEffect, useState } from 'react';
import { ColumnPluginType } from '../types';
import { RecordWithId } from '../../types/utility';
import { ColumnDefinition } from '../../ui';
import { usePluginProvider } from '../components';
import { ArrayUtils } from '../../utils/arrays';

export function usePluginColumns<T extends RecordWithId>({
  type,
}: {
  type: ColumnPluginType;
}) {
  const columnPlugins = usePluginProvider(state => state.columnPlugins);
  const [pluginColumns, setPluginColumns] = useState<ColumnDefinition<T>[]>([]);
  const columns = columnPlugins.filter(column => column.type === type);

  useEffect(() => {
    columns.forEach(plugin => {
      plugin.column().then(column => {
        const mapped = column as unknown as ColumnDefinition<T>;
        setPluginColumns(ArrayUtils.uniqBy([...pluginColumns, mapped], 'key'));
      });
    });

    // tidy up on unmount
    return () => setPluginColumns([]);
  }, [columnPlugins]);

  return pluginColumns;
}
