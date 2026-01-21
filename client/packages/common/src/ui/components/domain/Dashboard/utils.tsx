import { Plugins } from '@openmsupply-client/common';

type DashboardStatistic = NonNullable<Plugins['dashboard']>['statistic'];

export const filterCoreStats = <T extends { statContext: string }>(
  stats: T[],
  plugins: DashboardStatistic
): T[] => {
  if (!plugins?.length) return stats;

  // Get stat contexts that should be hidden from core statistics
  const hiddenContexts = new Set(
    plugins.flatMap(plugin => plugin.hiddenStats ?? [])
  );

  // Filter core statistics to exclude the contexts defined in plugin hiddenStats
  // Or return original core stat array if no hidden contexts
  return hiddenContexts.size > 0
    ? stats.filter(stat => !hiddenContexts.has(stat.statContext))
    : stats;
};
