import React, { useRef } from 'react';
import {
  Box,
  GlobalStyles,
  InfoTooltipIcon,
  LocaleKey,
  NothingHere,
  Table,
  useTranslation,
  ViewportList,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../api/operations.generated';
import { RnRFormLine } from './RnRFormLine';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  periodLength: number;
  disabled: boolean;
}

interface HeaderCellProps {
  label: LocaleKey;
  tooltip?: LocaleKey;
  width?: number;
}

const HeaderCell = ({ label, tooltip, width }: HeaderCellProps) => {
  const t = useTranslation('replenishment');

  return (
    <th style={{ minWidth: width }}>
      {tooltip === undefined ? (
        t(label)
      ) : (
        <Box display="flex">
          {t(label)}
          <InfoTooltipIcon title={t(tooltip)} />
        </Box>
      )}
    </th>
  );
};

export const ContentArea = ({
  data,
  saveLine,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation('replenishment');
  const ref = useRef<HTMLDivElement>(null);

  // TODO: move to backend, should join on item and sort by name!
  const lines = data.sort((a, b) => (a.item.name > b.item.name ? 1 : -1));

  return lines.length === 0 ? (
    <NothingHere body={t('error.no-items')} />
  ) : (
    <Box
      flex={1}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'unset',
        overflowY: 'auto',
        width: '100%',
      }}
      ref={ref}
    >
      <GlobalStyles
        styles={{
          thead: {
            position: 'sticky',
            top: 0,
            backgroundColor: '#fff',
            zIndex: 999,
          },
          '.sticky-column': {
            backgroundColor: '#fff',
            position: 'sticky',
            zIndex: 99,
          },
          '.first-column': {
            left: 0,
            position: '-webkit-sticky',
            minWidth: 80,
          },
          '.second-column': {
            borderRight: '1px solid blue',
            left: 79,
            minWidth: '300px',
            position: '-webkit-sticky',
          },
        }}
      />
      <Table
        sx={{
          height: '500px',
          borderCollapse: 'separate',
          overflowY: 'scroll',
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
            <HeaderCell label="label.strength" width={85} />
            <HeaderCell label="label.unit" width={80} />
            <HeaderCell label="label.ven" width={55} />
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
            <HeaderCell
              label="label.low-stock"
              tooltip="description.rnr-low-stock"
            />
            <HeaderCell label="label.comment" />
            <HeaderCell label="label.confirmed" />
            <HeaderCell
              label="label.approved-quantity"
              tooltip="description.rnr-approved-quantity"
            />
          </tr>
        </thead>

        <tbody>
          <ViewportList
            viewportRef={ref}
            items={lines}
            axis="y"
            renderSpacer={({ ref, style }) => <tr ref={ref} style={style} />}
            initialDelay={1}
          >
            {line => (
              <RnRFormLine
                key={line.id}
                id={line.id}
                periodLength={periodLength}
                saveLine={saveLine}
                disabled={disabled}
              />
            )}
          </ViewportList>
        </tbody>
      </Table>
    </Box>
  );
};
