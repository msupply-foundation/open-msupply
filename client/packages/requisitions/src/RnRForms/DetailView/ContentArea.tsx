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
  className?: string;
}

const HeaderCell = ({ className, label, tooltip, width }: HeaderCellProps) => {
  const t = useTranslation();

  return (
    <th className={className} style={{ minWidth: width }}>
      <Box display="flex" style={{ fontSize: 14 }}>
        {t(label)}
        {tooltip && <InfoTooltipIcon title={t(tooltip)} />}
      </Box>
    </th>
  );
};

export const ContentArea = ({
  data,
  saveLine,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  return data.length === 0 ? (
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
        scrollSnapType: 'x mandatory',
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
            minWidth: 90,
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '.second-column': {
            left: 90,
            minWidth: '300px',
            position: '-webkit-sticky',
          },
        }}
      />
      <Table
        sx={{
          borderCollapse: 'separate',
          overflowY: 'scroll',
          marginRight: '100px',
          scrollSnapAlign: 'end',
          '& th': {
            textAlign: 'left',
            padding: 1,
            fontWeight: 'bold',
            border: '1px solid',
            borderLeft: '0px',
            borderColor: 'gray.light',
          },
          '& td': {
            padding: '2px',
            border: '1px solid',
            borderLeft: '0px',
            borderColor: 'gray.light',
            fontSize: '14px',
          },
        }}
      >
        <thead>
          <tr>
            <HeaderCell
              className="sticky-column first-column"
              label="label.code"
            />
            <HeaderCell
              className="sticky-column second-column"
              label="label.name"
            />
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
              label="label.adjusted"
              tooltip="description.rnr-consumed-adjusted"
            />
            <HeaderCell
              label="label.losses"
              tooltip="description.rnr-adjustments"
            />
            <HeaderCell
              label="label.rnr-adjustments"
              tooltip="description.rnr-adjustments"
            />
            <HeaderCell label="label.rnr-stock-out-duration" />
            <HeaderCell
              label="label.rnr-final-balance"
              tooltip="description.rnr-final-balance"
            />
            <HeaderCell label="label.amc" tooltip="description.rnr-amc" />
            <HeaderCell
              label="label.rnr-minimum-quantity"
              tooltip="description.rnr-minimum-quantity"
            />
            <HeaderCell
              label="label.rnr-maximum-quantity"
              tooltip="description.rnr-maximum-quantity"
            />
            <HeaderCell label="label.expiry" tooltip="description.expiry" />
            <HeaderCell
              label="label.requested"
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
            items={data}
            axis="y"
            renderSpacer={({ ref, style }) => <tr ref={ref} style={style} />}
            initialDelay={1}
            itemSize={60}
            overscan={5} // Gives a buffer for when android keyboard opens
          >
            {line => (
              <RnRFormLine
                key={line.id}
                line={line}
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
