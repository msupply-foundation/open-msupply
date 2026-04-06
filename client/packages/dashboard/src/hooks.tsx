import React from 'react';
import { usePluginProvider } from '@openmsupply-client/common';

export const useDashboardWidgets = (coreWidgets: React.ReactElement[]) => {
  const { plugins } = usePluginProvider();
  const widgetPlugins = plugins.dashboard?.widget;

  if (!widgetPlugins) return coreWidgets;

  // Get widget contexts that should be hidden from core dashboard
  const hiddenContexts = new Set(
    widgetPlugins.flatMap(plugin => plugin.hiddenWidgets ?? [])
  );

  // Filter core widgets to exclude the contexts defined in plugin hiddenWidgets
  // Or return original core widget array if no hidden contexts
  const visibleCoreWidgets =
    hiddenContexts.size > 0
      ? coreWidgets.filter(
          widget => !hiddenContexts.has(widget.props.widgetContext)
        )
      : coreWidgets;

  const pluginWidgets =
    widgetPlugins?.map((plugin, index) => {
      const { Component } = plugin;
      return <Component key={index} />;
    }) ?? [];

  const widgets = [...visibleCoreWidgets, ...pluginWidgets];

  return widgets;
};

export const useDashboardPanels = (
  corePanels: React.ReactElement[],
  widgetContext: string
) => {
  const { plugins } = usePluginProvider();
  const panelPlugins = plugins.dashboard?.panel;

  if (!panelPlugins) return corePanels;

  // Get panel contexts that should be hidden from core panels
  const hiddenContexts = new Set(
    panelPlugins.flatMap(plugin => plugin.hiddenPanels ?? [])
  );

  // Filter core panels to exclude the contexts defined in plugin hiddenPanels
  // Or return original core panel array if no hidden contexts
  const visibleCorePanels =
    hiddenContexts.size > 0
      ? corePanels.filter(
          panel => !hiddenContexts.has(panel.props.panelContext)
        )
      : corePanels;

  const pluginPanels =
    panelPlugins?.map((plugin, index) => {
      const { Component } = plugin;
      return <Component key={index} widgetContext={widgetContext} />;
    }) ?? [];

  const panels = [...visibleCorePanels, ...pluginPanels];

  return panels;
};
