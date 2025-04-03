import { LocaleKey, TypedTFunction } from '@common/intl';
import { Formatter } from '@common/utils';
import { AssetPropertyFragment, MasterListRowFragment } from '.';
import { LocationRowFragment } from './Location/api';
import { StockLineRowFragment } from './Stock/api';
import { InvoiceNodeType, PropertyNode } from '@common/types';

export const locationsToCsv = (
  invoices: LocationRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('label.on-hold'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.code,
    node.name,
    node.onHold,
  ]);
  return Formatter.csv({ fields, data });
};

export const masterListsToCsv = (
  invoices: MasterListRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('heading.description'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.code,
    node.name,
    node.description,
  ]);
  return Formatter.csv({ fields, data });
};

export const stockLinesToCsv = (
  stockLines: StockLineRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.name'),
    t('label.batch'),
    t('label.expiry'),
    t('label.location'),
    t('label.unit'),
    t('label.pack-size'),
    t('label.num-packs'),
    t('label.available-packs'),
    t('label.supplier'),
  ];

  const data = stockLines.map(node => [
    node.id,
    node.item.code,
    node.item.name,
    node.batch,
    Formatter.csvDateString(node.expiryDate),
    node.location?.code,
    node.item.unitName,
    node.packSize,
    node.totalNumberOfPacks,
    node.availableNumberOfPacks,
    node.supplierName,
  ]);
  return Formatter.csv({ fields, data });
};

interface ParsedRow {
  id: string;
  [key: string]: string | undefined;
}

export const processProperties = <
  T extends { properties: Record<string, string> },
>(
  properties: AssetPropertyFragment[] | PropertyNode[],
  row: ParsedRow,
  importRow: T,
  rowErrors: string[],
  t: TypedTFunction<LocaleKey>
) => {
  properties.forEach(property => {
    const value = row[property.name] ?? row[property.key];
    if (!!value?.trim()) {
      if (!!property.allowedValues) {
        const allowedValues = property.allowedValues.split(',');
        if (allowedValues.every(v => v !== value)) {
          rowErrors.push(
            t('error.invalid-field-value', {
              field: property.name,
              value: value,
            })
          );
        }
      }
      switch (property.valueType) {
        case 'INTEGER':
        case 'FLOAT':
          if (Number.isNaN(Number(value))) {
            rowErrors.push(
              t('error.invalid-field-value', {
                field: property.name,
                value: value,
              })
            );
          }
          importRow.properties[property.key] = value;
          break;
        case 'BOOLEAN':
          const isTrue =
            value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
          importRow.properties[property.key] = isTrue ? 'true' : 'false';
          break;
        default:
          importRow.properties[property.key] = value;
      }
    }
  });
};

export const getInvoiceLocalisationKey = (type: InvoiceNodeType): LocaleKey => {
  switch (type) {
    case InvoiceNodeType.InboundShipment:
      return 'inbound-shipment';
    case InvoiceNodeType.OutboundShipment:
      return 'outbound-shipment';
    case InvoiceNodeType.CustomerReturn:
      return 'customer-return';
    case InvoiceNodeType.SupplierReturn:
      return 'supplier-return';
    case InvoiceNodeType.Prescription:
      return 'prescription';
    case InvoiceNodeType.InventoryAddition:
      return 'inventory-addition';
    case InvoiceNodeType.InventoryReduction:
      return 'inventory-reduction';
    case InvoiceNodeType.Repack:
      return 'label.repack';
  }
};

export const getNameValue = (t: TypedTFunction<LocaleKey>, name: string) => {
  if (name == 'repack') return t('label.repack');
  if (name == 'Inventory adjustments') return t('inventory-adjustment');
  return name;
};

export enum ReportType {
  INBOUND = "Inbound Shipment",
  INTERNAL_ORDER = "Internal Order",
  OUTBOUND_INVOICE_LANDSCAPE_WITH_LOGO = "Outbound Shipment (Landscape)",
  OUTBOUND_INVOICE_PORTRAIT_WITH_LOGO = "Outbound Shipment (Portrait)",
  PRESCRIPTION_RECEIPT = "Prescription Receipt",
  REPACK = "Repack",
  REQUISITION = "Requisition",
  STOCK_TAKE_DETAIL_VIEW = "Stocktake",
  STOCKTAKE_VARIANCE = "Stocktake Variance",
  STOCK_TAKE_WITH_QUANTITY = "Stocktake With Quantity",
  STOCK_TAKE_WOTHOUT_QUANTITY = "Stocktake Without Quantity",
}

export const REPORT_TRANSLATION_KEYS: Record<ReportType, LocaleKey> = {
  [ReportType.STOCKTAKE_VARIANCE]: 'report.stocktake-variance',
  [ReportType.INBOUND]: 'form.inbound',
  [ReportType.INTERNAL_ORDER]: 'form.internal-order',
  [ReportType.OUTBOUND_INVOICE_LANDSCAPE_WITH_LOGO]: 'form.outbound-invoice-landscape-woth-logo',
  [ReportType.OUTBOUND_INVOICE_PORTRAIT_WITH_LOGO]: 'form.outbound-invoice-portrait-woth-logo',
  [ReportType.PRESCRIPTION_RECEIPT]: 'form.prescription-receipt',
  [ReportType.REPACK]: 'form.repack',
  [ReportType.REQUISITION]: 'form.requisition',
  [ReportType.STOCK_TAKE_DETAIL_VIEW]: 'form.stocktake-detail-view',
  [ReportType.STOCK_TAKE_WITH_QUANTITY]: 'form.stocktake-with-quantity',
  [ReportType.STOCK_TAKE_WOTHOUT_QUANTITY]: 'form.stocktake-without-quantity',
};

export const getReportKey = (reportName: string): LocaleKey => {
  const reportType = Object.values(ReportType).find(
    type => type === reportName
  );
  if (reportType) {
    return REPORT_TRANSLATION_KEYS[reportType];
  }
  console.warn('Report name not found in translation keys:', reportName);
  // Fallback to using the report name directly as a key
  return reportName as LocaleKey;
}

