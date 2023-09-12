import { useEffect, useState } from 'react';
import { ColumnPlugin, ColumnPluginType } from '../types';
import { RecordWithId } from '../../types/utility';
import { ColumnDefinition } from '../../ui';
import { usePluginProvider } from '../components';
import { loadPluginColumn } from '../utils';

const mapPluginToColumnDefinition = async <T extends RecordWithId>(
  plugin: ColumnPlugin
): Promise<ColumnDefinition<T>> => {
  const { module, name } = plugin;
  const pluginColumn = await loadPluginColumn<T>({ plugin: name, module })();

  return pluginColumn.default;
};

export function usePluginColumns<T extends RecordWithId>({
  type,
}: {
  type: ColumnPluginType;
}) {
  const { updateColumnPlugin, columnPlugins } = usePluginProvider();
  const [pluginColumns, setPluginColumns] = useState<ColumnDefinition<T>[]>([]);
  const columns = columnPlugins.filter(column => column.type === type);

  useEffect(() => {
    columns
      .filter(plugin => !plugin.isLoaded)
      .forEach(plugin => {
        mapPluginToColumnDefinition<T>(plugin).then(column => {
          updateColumnPlugin({
            ...plugin,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            column: column as any,
            isLoaded: true,
          });
        });
      });

    setPluginColumns(
      columns
        .filter(plugin => plugin.isLoaded)
        .map(plugin =>
          'column' in plugin
            ? (plugin.column as unknown as ColumnDefinition<T>)
            : null
        )
        .filter(column => column !== null) as ColumnDefinition<T>[]
    );

    // tidy up on unmount
    return () => setPluginColumns([]);
  }, [columnPlugins]);

  return pluginColumns;
}
