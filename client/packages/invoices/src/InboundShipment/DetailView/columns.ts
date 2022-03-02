import {
  formatExpiryDateString,
  getRowExpandColumn,
  GenericColumnKey,
  getSumOfKeyReducer,
  getNotePopoverColumn,
  ifTheSameElseDefault,
  useColumns,
  Column,
  getUnitQuantity,
} from '@openmsupply-client/common';
import { LocationRowFragment } from '@openmsupply-client/system';
import { InboundItem } from './../../types';
import { InboundLineFragment } from '../api';

export const useInboundShipmentColumns = (): Column<
  InboundLineFragment | InboundItem
>[] =>
  useColumns<InboundLineFragment | InboundItem>(
    [
      [
        getNotePopoverColumn(),
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const noteSections = rowData.lines
                .map(({ batch, note }) => ({
                  header: batch ?? '',
                  body: note ?? '',
                }))
                .filter(({ body }) => !!body);

              return noteSections.length ? noteSections : null;
            } else {
              return rowData.note
                ? { header: rowData.batch ?? '', body: rowData.note }
                : null;
            }
          },
        },
      ],
      [
        'itemCode',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const items = lines.map(({ item }) => item);
              return ifTheSameElseDefault(items, 'code', '');
            } else {
              return rowData.item.code;
            }
          },
        },
      ],
      [
        'itemName',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const items = lines.map(({ item }) => item);
              return ifTheSameElseDefault(items, 'name', '');
            } else {
              return rowData.item.name;
            }
          },
        },
      ],
      [
        'batch',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]');
            } else {
              return rowData.batch;
            }
          },
        },
      ],
      [
        'expiryDate',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const expiryDate = ifTheSameElseDefault(
                lines,
                'expiryDate',
                null
              );

              return formatExpiryDateString(expiryDate);
            } else {
              return formatExpiryDateString(rowData.expiryDate);
            }
          },
        },
      ],
      [
        'locationName',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const locations = lines
                .map(({ location }) => location)
                .filter(Boolean) as LocationRowFragment[];
              return ifTheSameElseDefault(locations, 'name', '');
            } else {
              return rowData.location?.name ?? '';
            }
          },
        },
      ],
      [
        'sellPricePerPack',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'sellPricePerPack', '');
            } else {
              return rowData.sellPricePerPack;
            }
          },
        },
      ],
      [
        'packSize',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'packSize', '');
            } else {
              return rowData.packSize;
            }
          },
        },
      ],
      [
        'unitQuantity',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return lines.reduce(getUnitQuantity, 0);
            } else {
              return rowData.packSize * rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'numberOfPacks',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return lines.reduce(getSumOfKeyReducer('numberOfPacks'), 0);
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      getRowExpandColumn(),
      GenericColumnKey.Selection,
    ],
    {},
    []
  );

export const useExpansionColumns = (): Column<InboundLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    'locationName',
    'numberOfPacks',
    'packSize',
    'costPricePerPack',
  ]);
