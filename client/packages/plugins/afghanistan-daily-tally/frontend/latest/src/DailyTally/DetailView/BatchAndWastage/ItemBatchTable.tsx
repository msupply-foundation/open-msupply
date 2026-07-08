import React from 'react';
import {
  NumericTextInput,
  Switch,
  useFormatDateTime,
  useTheme,
} from '@openmsupply-client/common';
import { usePluginTranslation } from '../../../locales';
import { BatchEntry } from '../draft';
import { BatchInfo, ItemWithBatches } from './useVaccineBatchData';
import {
  batchStockOnHand,
  dosesPerUnit,
  itemUnitLabel,
  openVialWastage,
} from './coverageMath';
import { useDoseFormat } from '../useDoseFormat';

interface Props {
  item: ItemWithBatches;
  showItemHeader: boolean;
  batches: Record<string, BatchEntry>;
  setBatch: (stockLineId: string, next: BatchEntry) => void;
  readOnly: boolean;
  isVaccine: boolean;
}

const emptyEntry: BatchEntry = {
  issued: 0,
  openVialWastageDoses: 0,
  closedVialWastageDoses: 0,
  wasted: 0,
  hasOpenVialWastage: false,
};

const INPUT_WIDTH = 62;

interface BatchRowProps {
  batch: BatchInfo;
  entry: BatchEntry;
  setBatch: (stockLineId: string, next: BatchEntry) => void;
  item: ItemWithBatches;
  readOnly: boolean;
  isVaccine: boolean;
}

const BatchRow = React.memo(function BatchRow({
  batch,
  entry,
  setBatch,
  item,
  readOnly,
  isVaccine,
}: BatchRowProps) {
  const theme = useTheme();
  const TD: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '13px',
    borderTop: `1px solid ${theme.palette.divider}`,
    verticalAlign: 'middle',
  };
  const { localisedDate } = useFormatDateTime();
  const { formatDoses } = useDoseFormat();

  const stockDoses = batchStockOnHand(item, batch.id);
  const wastageEnabled = isVaccine ? entry.hasOpenVialWastage : true;

  return (
    <tr>
      <td style={{ ...TD, color: batch.campaignName ? theme.palette.text.primary : theme.palette.text.disabled, wordBreak: 'break-word', maxWidth: 120 }}>
        {batch.campaignName ?? '—'}
      </td>
      <td style={TD}>{batch.batch ?? '—'}</td>
      <td style={{ ...TD, color: theme.palette.text.secondary }}>
        {batch.expiryDate ? localisedDate(batch.expiryDate) : '—'}
      </td>
      <td style={{ ...TD, textAlign: 'center' }}>{formatDoses(stockDoses)}</td>
      <td style={TD}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <NumericTextInput
            width={INPUT_WIDTH}
            value={entry.issued}
            min={0}
            disabled={readOnly}
            onChange={next => {
              const issued = next ?? 0;
              setBatch(batch.id, {
                ...entry,
                issued,
                autoIssued: false,
                ...(entry.hasOpenVialWastage && {
                  openVialWastageDoses: openVialWastage(issued, dosesPerUnit(item)),
                }),
              });
            }}
          />
        </div>
      </td>
      {isVaccine && (
        <td style={TD}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Switch
              label=""
              checked={entry.hasOpenVialWastage}
              disabled={readOnly}
              onChange={(_, checked) =>
                setBatch(batch.id, {
                  ...entry,
                  hasOpenVialWastage: checked,
                  openVialWastageDoses: checked
                    ? openVialWastage(entry.issued, dosesPerUnit(item))
                    : 0,
                })
              }
            />
          </div>
        </td>
      )}
      <td style={TD}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {wastageEnabled ? (
            <NumericTextInput
              width={INPUT_WIDTH}
              value={isVaccine ? entry.openVialWastageDoses : entry.wasted}
              min={0}
              disabled={readOnly}
              onChange={next =>
                setBatch(
                  batch.id,
                  isVaccine
                    ? { ...entry, openVialWastageDoses: next ?? 0 }
                    : { ...entry, wasted: next ?? 0 }
                )
              }
            />
          ) : (
            <span style={{ color: theme.palette.text.disabled }}>0</span>
          )}
        </div>
      </td>
    </tr>
  );
});

export const ItemBatchTable = ({
  item,
  showItemHeader,
  batches,
  setBatch,
  readOnly,
  isVaccine,
}: Props) => {
  const theme = useTheme();
  const TH: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 700,
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
    lineHeight: 1.4,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  };
  const t = usePluginTranslation();
  const unit = itemUnitLabel(item);

  const inStockBatches = item.batches
    .filter(b => b.availableNumberOfPacks > 0)
    .sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : 0;
    });

  return (
    <div style={{ width: '100%' }}>
      {showItemHeader && (
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
          {item.name}
        </p>
      )}

      {inStockBatches.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.palette.text.secondary, margin: 0 }}>
          {t('batch.no-stock')}
        </p>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}
          >
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'start' }}>
                  {t('batch.col.campaign')}
                </th>
                <th style={{ ...TH, textAlign: 'start' }}>
                  {t('batch.col.batch')}
                </th>
                <th style={{ ...TH, textAlign: 'start' }}>
                  {t('batch.col.expiry')}
                </th>
                <th style={{ ...TH, textAlign: 'center' }}>
                  {t('batch.col.stock')}
                  <br />({unit})
                </th>
                <th style={{ ...TH, textAlign: 'center' }}>
                  {t('batch.col.used')}
                  <br />({unit})
                </th>
                {isVaccine && (
                  <th style={{ ...TH, textAlign: 'center' }}>
                    {(() => {
                      const s = t('batch.col.open-vial');
                      const i = s.lastIndexOf(' ');
                      return i > 0 ? <>{s.slice(0, i)}<br />{s.slice(i + 1)}</> : <>{s}</>;
                    })()}
                  </th>
                )}
                <th style={{ ...TH, textAlign: 'end' }}>
                  {t('batch.col.wasted')}
                  <br />({unit})
                </th>
              </tr>
            </thead>
            <tbody>
              {inStockBatches.map(batch => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  entry={batches[batch.id] ?? emptyEntry}
                  setBatch={setBatch}
                  item={item}
                  readOnly={readOnly}
                  isVaccine={isVaccine}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
