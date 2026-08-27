import {
  DisplaySettingsInput,
  DisplaySettingsHash,
  LabelPrinterSettingsInput,
  ConfigureNamePropertyInput,
} from '@openmsupply-client/common';

import { Sdk } from './operations.generated';

export const getHostQueries = (sdk: Sdk) => ({
  get: {
    displaySettings: async (input: DisplaySettingsHash) => {
      const result = await sdk.displaySettings({ input });
      return result.displaySettings;
    },
    databaseSettings: async () => {
      const result = await sdk.databaseSettings();
      return result.databaseSettings;
    },
    labelPrinterSettings: async () => {
      const result = await sdk.labelPrinterSettings();
      return result.labelPrinterSettings;
    },
  },

  updateDisplaySettings: async (displaySettings: DisplaySettingsInput) => {
    const result = await sdk.updateDisplaySettings({ displaySettings });
    return result?.updateDisplaySettings;
  },
  updateLabelPrinterSettings: async (
    labelPrinterSettings: LabelPrinterSettingsInput
  ) => {
    const result = await sdk.updateLabelPrinterSettings({
      labelPrinterSettings,
    });
    return result?.updateLabelPrinterSettings;
  },

  configureNameProperties: async (input: ConfigureNamePropertyInput[]) => {
    const result = await sdk.configureNameProperties({ input });
    return result?.centralServer.general.configureNameProperties;
  },
});
