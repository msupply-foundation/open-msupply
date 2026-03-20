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
  const invoices = result?.invoices as any;
  return invoices?.nodes ?? [];
},
reportBuilderRequisitions: async (storeId: string) => {
  const result = await sdk.reportBuilderRequisitions({ storeId });
  const requisitions = result?.requisitions as any;
  return requisitions?.nodes ?? [];
},
reportBuilderStocktakes: async (storeId: string) => {
  const result = await sdk.reportBuilderStocktakes({ storeId });
  const stocktakes = result?.stocktakes as any;
  return stocktakes?.nodes ?? [];
},
reportBuilderPurchaseOrders: async (storeId: string) => {
  const result = await sdk.reportBuilderPurchaseOrders({ storeId });
  const purchaseOrders = result?.purchaseOrders as any;
  return purchaseOrders?.nodes ?? [];
},
reportBuilderList: async (
  storeId: string,
  userLanguage: string,
  filter?: ReportBuilderListQueryVariables['filter']
) => {
  const result = await sdk.reportBuilderList({
    storeId,
    userLanguage,
    filter,
  });
  const reports = result?.reports as any;
  return reports?.nodes ?? [];
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
