import {
  DisplaySettingsInput,
  DisplaySettingsHash,
  LabelPrinterSettingsInput,
  ConfigureNamePropertyInput,
} from '@openmsupply-client/common';

import {
  GenerateReportDefinitionQueryVariables,
  UpsertReportDefinitionMutationVariables,
  ReportBuilderListQueryVariables,
  Sdk,
} from './operations.generated';

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
    reportBuilderInvoices: async (storeId: string, invoiceType: string) => {
      const result = await sdk.reportBuilderRecords({ storeId, invoiceType });
      return 'nodes' in result.invoices ? result.invoices.nodes : [];
    },
    reportBuilderRequisitions: async (storeId: string) => {
      const result = await sdk.reportBuilderRequisitions({ storeId });
      return 'nodes' in result.requisitions ? result.requisitions.nodes : [];
    },
    reportBuilderStocktakes: async (storeId: string) => {
      const result = await sdk.reportBuilderStocktakes({ storeId });
      return 'nodes' in result.stocktakes ? result.stocktakes.nodes : [];
    },
    reportBuilderPurchaseOrders: async (storeId: string) => {
      const result = await sdk.reportBuilderPurchaseOrders({ storeId });
      return 'nodes' in result.purchaseOrders ? result.purchaseOrders.nodes : [];
    },
    reportBuilderList: async (
      storeId: string,
      userLanguage: string,
      filter?: ReportBuilderListQueryVariables['filter']
    ) => {
      const result = await sdk.reportBuilderList({ storeId, userLanguage, filter });
      return 'nodes' in result.reports ? result.reports.nodes : [];
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

  generateOneOffReport: async (
    input: GenerateReportDefinitionQueryVariables
  ) => {
    const result = await sdk.generateReportDefinition(input);
    return result?.generateReportDefinition;
  },

  upsertReportDefinition: async (
    input: UpsertReportDefinitionMutationVariables
  ) => {
    const result = await sdk.upsertReportDefinition(input);
    return result?.upsertReportDefinition;
  },
});
