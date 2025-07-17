import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { ColumnAlign, ColumnDefinition } from './types';
import { NumberCell } from '../components';
import { StocktakeLineFragment } from '@openmsupply-client/inventory/src/Stocktake/api';
import { LocaleKey, TypedTFunction, useFormatNumber } from '@common/intl';
import { StocktakeSummaryItem } from 'packages/inventory/src/types';
import { NumUtils } from '@common/utils';

interface DifferenceValues {
  total: number;
  displayDoses: boolean;
  totalInDoses: number | null;
}

const getDifferenceValues = (
  rowData: StocktakeLineFragment | StocktakeSummaryItem,
  manageVaccinesInDoses: boolean
): DifferenceValues => {
  if ('lines' in rowData) {
    const lines = rowData.lines;
    const displayDoses = manageVaccinesInDoses && !!lines[0]?.item.isVaccine;
    const total = lines.reduce(
      (sum, line) =>
        sum +
        (line.snapshotNumberOfPacks -
          (line.countedNumberOfPacks ?? line.snapshotNumberOfPacks)),
      0
    );
    const totalInDoses = displayDoses
      ? lines.reduce(
          (sum, line) =>
            sum +
            (line.item.doses ?? 1) *
              (line.packSize ?? 1) *
              (line.snapshotNumberOfPacks -
                (line.countedNumberOfPacks ?? line.snapshotNumberOfPacks)),
          0
        )
      : null;
    return { displayDoses, total, totalInDoses };
  }

  const displayDoses = manageVaccinesInDoses && rowData.item.isVaccine;
  const total =
    (rowData.countedNumberOfPacks ?? rowData.snapshotNumberOfPacks) -
    rowData.snapshotNumberOfPacks;
  const totalInDoses =
    displayDoses && rowData.item.doses
      ? total * (rowData.packSize ?? 1) * rowData.item.doses
      : null;
  return { displayDoses, total, totalInDoses };
};

export const getDifferenceColumn = (
  t: TypedTFunction<LocaleKey>,
  manageVaccinesInDoses: boolean
): ColumnDefinition<StocktakeLineFragment | StocktakeSummaryItem> => ({
  label: 'label.difference',
  align: ColumnAlign.Center,
  key: 'id',
  accessor: ({ rowData }) =>
    getDifferenceValues(rowData, manageVaccinesInDoses).total,
  Cell: props => {
    const { rowData } = props;
    const { displayDoses, totalInDoses } = getDifferenceValues(
      rowData,
      manageVaccinesInDoses
    );
    const formatNumber = useFormatNumber();
    const doses = formatNumber.round(totalInDoses ?? undefined, 2);
    const tooltip = formatNumber.tooltip(totalInDoses ?? undefined);

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          width: '100%',
        }}
      >
        <NumberCell {...props} />
        {displayDoses && !!totalInDoses && (
          <Typography>
            {`(`}
            <Tooltip title={tooltip}>
              <span>
                {!!NumUtils.hasMoreThanTwoDp(totalInDoses ?? 0)
                  ? `${doses}...`
                  : doses}
              </span>
            </Tooltip>
            {` ${t('label.doses')})`}
          </Typography>
        )}
      </Box>
    );
  },
});
