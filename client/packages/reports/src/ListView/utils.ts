import { ReportRowFragment } from '@openmsupply-client/system';

export enum ReportSubContext {
  StockAndItems = 'StockAndItems',
  Expiring = 'Expiring',
  HIVCareProgram = 'HIVCareProgram',
  Vaccinations = 'Vaccinations',
  Encounters = 'Encounters',
  Other = 'Other',
}

export const PROGRAM_SUB_CONTEXTS = [
  ReportSubContext.HIVCareProgram,
  ReportSubContext.Vaccinations,
  ReportSubContext.Encounters,
] as const;

export const categoriseReports = (reports: ReportRowFragment[]) => {
  return {
    stockAndItems: reports.filter(
      r => r.subContext === ReportSubContext.StockAndItems
    ),
    expiring: reports.filter(r => r.subContext === ReportSubContext.Expiring),
    other: reports.filter(r => r.subContext === ReportSubContext.Other),

    programs: reports.filter(r =>
      PROGRAM_SUB_CONTEXTS.includes(
        r.subContext as (typeof PROGRAM_SUB_CONTEXTS)[number]
      )
    ),
  };
};
