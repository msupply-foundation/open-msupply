import React from 'react';
import {
  Box,
  GlobalStyles,
  InfoTooltipIcon,
  LocaleKey,
  NothingHere,
  Table,
  useTranslation,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../api/operations.generated';
import { RnRFormLine } from './RnRFormLine';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  markDirty: (id: string) => void;
  periodLength: number;
  disabled: boolean;
}

interface HeaderCellProps {
  label: LocaleKey;
  tooltip?: LocaleKey;
}

const HeaderCell = ({ label, tooltip }: HeaderCellProps) => {
  const t = useTranslation('replenishment');

  return tooltip === undefined ? (
    <th>{t(label)}</th>
  ) : (
    <th>
      <Box display="flex">
        {t(label)}
        <InfoTooltipIcon title={t(tooltip)} />
      </Box>
    </th>
  );
};

export const ContentArea = ({
  data,
  saveLine,
  markDirty,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation('replenishment');

  // TODO: move to backend, should join on item and sort by name!
  const lines = data.sort((a, b) => (a.item.name > b.item.name ? 1 : -1));

  return lines.length === 0 ? (
    <NothingHere body={t('error.no-items')} />
  ) : (
    <Box flex={1} padding={2}>
      <GlobalStyles
        styles={{
          '.sticky-column': {
            backgroundColor: '#fff',
            position: 'sticky',
            zIndex: 99,
          },
          '.first-column': {
            position: '-webkit-sticky',
            left: 16,
            width: 80,
          },
          '.second-column': {
            position: '-webkit-sticky',
            left: 88,
            minWidth: '300px',
            borderRight: '1px solid blue',
          },
        }}
      />
      <Table
        sx={{
          '& th': {
            textAlign: 'left',
            padding: 1,
            fontWeight: 'bold',
            border: '1px solid',
            borderColor: 'gray.light',
          },
          '& td': {
            padding: '2px',
            border: '1px solid',
            borderColor: 'gray.light',
          },
        }}
      >
        <thead>
          <tr>
            <th className="sticky-column first-column">{t('label.code')}</th>
            <th className="sticky-column second-column">{t('label.name')}</th>
            <HeaderCell label="label.strength" />
            <HeaderCell label="label.unit" />
            <HeaderCell label="label.ven" />
            <HeaderCell
              label="label.rnr-initial-balance"
              tooltip="description.rnr-initial-balance"
            />
            <HeaderCell
              label="label.rnr-received"
              tooltip="description.rnr-received"
            />
            <HeaderCell
              label="label.rnr-consumed"
              tooltip="description.rnr-consumed"
            />
            <HeaderCell
              label="label.rnr-consumed-adjusted"
              tooltip="description.rnr-consumed-adjusted"
            />
            <HeaderCell label="label.rnr-adjustments" />
            <HeaderCell label="label.rnr-stock-out-duration" />
            <HeaderCell
              label="label.rnr-final-balance"
              tooltip="description.rnr-final-balance"
            />
            <HeaderCell label="label.amc" tooltip="description.rnr-amc" />
            <HeaderCell
              label="label.rnr-maximum-quantity"
              tooltip="description.rnr-maximum-quantity"
            />
            <HeaderCell label="label.expiry" tooltip="description.expiry" />
            <HeaderCell
              label="label.requested-quantity"
              tooltip="description.rnr-requested-quantity"
            />
            <HeaderCell label="label.comment" />
            <HeaderCell label="label.confirmed" />
          </tr>
        </thead>

        <tbody>
          {lines.map(line => (
            <RnRFormLine
              key={line.id}
              line={line}
              periodLength={periodLength}
              saveLine={saveLine}
              markDirty={markDirty}
              disabled={disabled}
            />
          ))}
        </tbody>
      </Table>
    </Box>
  );
};
