import React from 'react';
import { Statistic, usePluginProvider } from '@openmsupply-client/common';

import type { Stat } from '@openmsupply-client/common';

export const useDashboardStats = (
  coreStats: Stat[] = [],
  panelContext: string
) => {
  const { plugins } = usePluginProvider();
  const statPlugins = plugins.dashboard?.statistic;

  if (!statPlugins) {
    return coreStats.map(stat => (
      <Statistic key={stat.statContext} {...stat} />
    ));
  }

  // Get stat contexts that should be hidden from core statistics
  const hiddenContexts = new Set(
    statPlugins.flatMap(plugin => plugin.hiddenStats ?? [])
  );

  // Filter core stats to exclude the contexts defined in plugin hiddenStats
  // Or return original core stats array if no hidden contexts
  const visibleCoreStats =
    hiddenContexts.size > 0
      ? coreStats.filter(stat => !hiddenContexts.has(stat.statContext))
      : coreStats;

  const pluginStatistics =
    statPlugins?.map((plugin, index) => {
      const { Component } = plugin;
      return <Component key={index} panelContext={panelContext} />;
    }) ?? [];

  const statistics = [
    ...visibleCoreStats.map(stat => (
      <Statistic key={stat.statContext} {...stat} />
    )),
    ...pluginStatistics,
  ];

  return statistics;
};
