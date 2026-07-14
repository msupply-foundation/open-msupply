import { DateUtils, LocaleKey, TypedTFunction } from '@common/intl';
import { Formatter } from '@common/utils';
import { AssetPropertyFragment, MasterListRowFragment } from '.';
import { LocationRowFragment } from './Location/api';
import { StockLineListRowFragment } from './Stock/api';
import { InvoiceNodeType, PropertyNode } from '@common/types';

export const locationsToCsv = (
  invoices: LocationRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.code'),
    t('label.name'),
    t('label.location-type'),
    t('label.volume'),
    t('label.volume-used'),
    t('label.on-hold'),
  ];

  const data = invoices.map(node => [
    node.code,
    node.name,
    node.locationType?.name,
    node.volume,
    node.volumeUsed,
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
  stockLines: StockLineListRowFragment[],
  t: TypedTFunction<LocaleKey>,
  manageVvmStatusForStock: boolean
) => {
  const fields: string[] = [
    t('label.code'),
    t('label.name'),
    t('label.master-lists'),
    t('label.batch'),
    t('label.expiry'),
    t('label.manufacture-date'),
    ...(manageVvmStatusForStock ? [t('label.vvm-status')] : []),
    t('label.location-code'),
    t('label.location-name'),
    t('label.unit'),
    t('label.pack-size'),
    t('label.pack-quantity'),
    t('label.soh'),
    t('label.available-soh'),
    t('label.pack-cost-price'),
    t('label.pack-sell-price'),
    t('label.total'),
    t('label.manufacturer'),
    t('label.campaign-only'),
    t('label.supplier'),
  ];

  const data = stockLines.map(node => [
    node.item.code,
    node.item.name,
    node.item.masterLists?.map(m => m.name).join(', '),
    node.batch,
    Formatter.csvDateString(node.expiryDate),
    Formatter.csvDateString(node.manufactureDate),
    ...(manageVvmStatusForStock ? [node.vvmStatus?.description] : []),
    node.location?.code,
    node.location?.name,
    node.item.unitName,
    node.packSize,
    node.totalNumberOfPacks,
    node.totalNumberOfPacks * node.packSize,
    node.availableNumberOfPacks * node.packSize,
    node.costPricePerPack,
    node.sellPricePerPack,
    node.totalNumberOfPacks * node.costPricePerPack,
    node.manufacturer?.name,
    node.campaign?.name,
    node.supplierName,
  ]);
  return Formatter.csv({ fields, data });
};

interface ParsedRow {
  id: string;
  [key: string]: string | undefined;
}

export const processProperties = <
  T extends { properties: Record<string, string | number> },
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
          importRow.properties[property.key] = Number(value);
          break;
        case 'BOOLEAN':
          const isTrue =
            value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
          importRow.properties[property.key] = isTrue ? 'true' : 'false';
          break;
        case 'DATE': {
          // CSV template documents date columns as DD/MM/YYYY; reject anything
          // else so we don't silently push unparseable strings into properties
          // (the server stores YYYY-MM-DD and would lose the value otherwise).
          const hasFourDigitYear = value.split('/')[2]?.length === 4;
          const parsed = hasFourDigitYear
            ? DateUtils.getDateOrNull(value, 'dd/MM/yyyy')
            : null;
          const normalised = parsed ? Formatter.naiveDate(parsed) : null;
          if (!normalised) {
            rowErrors.push(
              t('error.invalid-field-value', {
                field: property.name,
                value: value,
              })
            );
            break;
          }
          importRow.properties[property.key] = normalised;
          break;
        }
        default:
          importRow.properties[property.key] = value;
      }
    }
  });
};

export const getInvoiceLocalisationKey = (
  type: InvoiceNodeType,
  isFilter = false
): LocaleKey => {
  switch (type) {
    case InvoiceNodeType.InboundShipment:
      return isFilter ? 'inbound-shipment' : 'label.inbound-shipment';
    case InvoiceNodeType.OutboundShipment:
      return isFilter ? 'outbound-shipment' : 'label.outbound-shipment';
    case InvoiceNodeType.CustomerReturn:
      return isFilter ? 'customer-returns' : 'label.customer-return';
    case InvoiceNodeType.SupplierReturn:
      return isFilter ? 'supplier-returns' : 'label.supplier-return';
    case InvoiceNodeType.Prescription:
      return isFilter ? 'prescriptions' : 'label.prescription';
    case InvoiceNodeType.InventoryAddition:
      return isFilter ? 'inventory-additions' : 'label.inventory-addition';
    case InvoiceNodeType.InventoryReduction:
      return isFilter ? 'inventory-reductions' : 'label.inventory-reduction';
    case InvoiceNodeType.Repack:
      return isFilter ? 'label.repacks' : 'label.repack';
  }
};

export const getNameValue = (t: TypedTFunction<LocaleKey>, name: string) => {
  if (name == 'repack') return t('label.repack');
  if (name == 'Inventory adjustments') return t('inventory-adjustment');
  return name;
};
