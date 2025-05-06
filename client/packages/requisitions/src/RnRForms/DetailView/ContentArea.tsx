import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  // Fade,
  GlobalStyles,
  InfoIcon,
  LocaleKey,
  NothingHere,
  Table,
  Tooltip,
  Typography,
  useTranslation,
  ViewportList,
  ViewportListRef,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../api/operations.generated';
import { RnRFormLine } from './RnRFormLine';
import { oneTime, useRnRFormContext } from '../api';
import { Search } from './Search';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
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

  const Header = (
    <Box display="flex" style={{ fontSize: 14 }}>
      {t(label)}
      {tooltip && (
        <div style={{ transform: 'scale(0.7)', cursor: 'help' }}>
          <InfoIcon fontSize="small" />
        </div>
      )}
    </Box>
  );
  return (
    <th className={className} style={{ minWidth: width }}>
      {tooltip ? <Tooltip title={t(tooltip)}>{Header}</Tooltip> : Header}
    </th>
  );
};
export const ContentArea = ({
  data,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<ViewportListRef>(null);
  const { setListRef } = useRnRFormContext(
    oneTime(({ setListRef }) => ({
      setListRef,
    }))
  );

  useEffect(() => {
    // Store the ref in Zustand state
    setListRef(listRef);
  }, [setListRef]);

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
      ref={containerRef}
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
            left: 0,
            width: 'fit-content',
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
            borderColor: 'gray.light',
          },
          '& td': {
            padding: '2px',
            border: '1px solid',
            borderColor: 'gray.light',
            fontSize: '14px',
          },
        }}
      >
        <Headers />

        <ViewportList
          viewportRef={containerRef}
          items={data}
          ref={listRef}
          axis="y"
          renderSpacer={({ ref, style }) => <tr ref={ref} style={style} />}
          initialDelay={1}
          itemSize={70}
          overscan={5} // Gives a buffer for when android keyboard opens
        >
          {(line, index) => (
            <Line
              key={line.id}
              index={index}
              line={line}
              periodLength={periodLength}
              disabled={disabled}
            />
          )}
        </ViewportList>
      </Table>
    </Box>
  );
};

const Line = ({
  line,
  periodLength,
  disabled,
  index,
}: {
  line: RnRFormLineFragment;
  periodLength: number;
  disabled: boolean;
  index: number;
}) => {
  const [isDelayed, setIsDelayed] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsDelayed(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <tbody>
      <tr
        style={{
          borderBottom: 'none',
          backgroundColor: index % 2 == 1 ? 'rgba(0,0,0,0.02)' : undefined,
        }}
      >
        <td colSpan={20} style={{ borderBottom: 'none' }}>
          <Typography
            className="sticky-column"
            sx={{
              backgroundColor: 'rgba(0,0,0,0)',
              fontSize: '1em',
              fontWeight: 'bold',
              textAlign: 'center',
              paddingTop: 1,
            }}
          >
            {`(${line.item.code}) ${line.item.name} ${line.item.unitName || ''}`}
          </Typography>
        </td>
      </tr>
      {isDelayed ? (
        <tr
          style={{
            backgroundColor: index % 2 == 1 ? 'rgba(0,0,0,0.02)' : undefined,
          }}
        >
          <td colSpan={20} style={{ height: '42px' }}></td>
        </tr>
      ) : (
        <RnRFormLine
          index={index}
          key={line.id}
          lineId={line.id}
          periodLength={periodLength}
          disabled={disabled}
        />
      )}
    </tbody>
  );
};

const Headers = () => {
  const t = useTranslation();

  return (
    <thead>
      <tr>
        <th>
          <Box
            sx={{
              fontSize: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Search />
            {t('label.ven')}
          </Box>
        </th>
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
        <HeaderCell label="label.losses" tooltip="description.rnr-losses" />
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
        <HeaderCell
          label="label.approved-quantity"
          tooltip="description.rnr-approved-quantity"
        />
      </tr>
    </thead>
  );
};
