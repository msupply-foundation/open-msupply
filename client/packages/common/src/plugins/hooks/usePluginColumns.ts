import { useEffect, useState } from 'react';
import { ColumnPluginType } from '../types';
import { RecordWithId } from '../../types/utility';
import { ColumnDefinition } from '../../ui';
import { usePluginProvider } from '../components';

export function usePluginColumns<T extends RecordWithId>({
  type,
}: {
  type: ColumnPluginType;
}) {
  const { columnPlugins } = usePluginProvider();
  const [pluginColumns, setPluginColumns] = useState<ColumnDefinition<T>[]>([]);
  const columns = columnPlugins.filter(column => column.type === type);

  useEffect(() => {
    columns.forEach(plugin => {
      plugin.column().then(column => {
        const mapped = column as unknown as ColumnDefinition<T>;
        setPluginColumns([...pluginColumns, mapped]);
      });
    });

    // tidy up on unmount
    return () => setPluginColumns([]);
  }, [columnPlugins]);

  return pluginColumns;
}
