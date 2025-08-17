import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useTranslation,
  MiniTable,
  NothingHere,
  AppSxProp,
  useRowStyle,
  PreferenceKey,
  usePreference,
} from '@openmsupply-client/common';
import { InboundItem } from '../../../types';
import { useInbound, InboundLineFragment } from '../../api';
import { useExpansionColumns } from './columns';
import { isInboundPlaceholderRow } from '../../../utils';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: InboundLineFragment | InboundItem) => void);
  displayInDoses?: boolean;
}

interface ExpandoPrefs {
  allowTrackingOfStockByDonor?: boolean;
}

const Expando = ({
  rowData,
  displayInDoses,
  preferences,
}: {
  rowData: InboundLineFragment | InboundItem;
  displayInDoses?: boolean;
  preferences?: ExpandoPrefs;
}) => {
  if ('lines' in rowData && rowData.lines.length > 1) {
    const isVaccineItem = rowData.lines[0]?.item.isVaccine ?? false;
    return (
      <ExpandoInner
        rowData={rowData}
        withDoseColumns={displayInDoses && isVaccineItem}
        preferences={preferences}
      />
    );
  } else {
    return null;
  }
};

const ExpandoInner = ({
  rowData,
  withDoseColumns,
  preferences,
}: {
  rowData: InboundLineFragment | InboundItem;
  withDoseColumns?: boolean;
  preferences?: ExpandoPrefs;
}) => {
  const expandoColumns = useExpansionColumns(withDoseColumns, preferences);
  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

const useHighlightPlaceholderRows = (
  rows: InboundLineFragment[] | InboundItem[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;
    const placeholders = [];

    // This is a verbose .filter() on `rows` to find the placeholder lines.
    // There is an issue with using `filter()` on a type which is
    // A[] | B[]
    // https://github.com/microsoft/TypeScript/issues/44373
    for (const row of rows) {
      if ('type' in row) {
        if (isInboundPlaceholderRow(row)) {
          placeholders.push(row.id);
        }
      } else {
        const hasPlaceholder = row.lines.some(isInboundPlaceholderRow);
        if (hasPlaceholder) {
          // Add both the OutboundItem and the individual lines, as
          // this will cause the item to be highlighted as well as the
          // lines within the expansion when grouped.
          row.lines.forEach(line => {
            if (isInboundPlaceholderRow(line)) {
              placeholders.push(line.id);
            }
          });
          placeholders.push(row.id);
        }
      }
    }

    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea: FC<ContentAreaProps> = React.memo(
  ({ onAddItem, onRowClick, displayInDoses }) => {
    const t = useTranslation();
    const isDisabled = useInbound.utils.isDisabled();
    const { columns, rows } = useInbound.lines.rows();
    useHighlightPlaceholderRows(rows);

    const { data: preferences } = usePreference(
      PreferenceKey.AllowTrackingOfStockByDonor
    );
    return (
      <DataTable
        id="inbound-detail"
        onRowClick={onRowClick}
        ExpandContent={props => (
          <Expando
            {...props}
            displayInDoses={displayInDoses}
            preferences={preferences}
          />
        )}
        columns={columns}
        data={rows}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-inbound-items')}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
        isRowAnimated={true}
      />
    );
  }
);
