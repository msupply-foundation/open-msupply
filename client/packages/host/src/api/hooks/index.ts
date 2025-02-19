import { Plugins } from './plugins';
import { Settings } from './settings';

export const useHost = {
  plugins: {
    list: Plugins.usePlugins,
  },
  settings: {
    displaySettings: Settings.useDisplaySettings,
    updateDisplaySettings: Settings.useUpdateDisplaySettings,
    labelPrinterSettings: Settings.useLabelPrinterSettings,
    updateLabelPrinterSettings: Settings.useUpdateLabelPrinterSettings,
  },
};
