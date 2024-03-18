import React from 'react';
import {
  Autocomplete,
  BasicTextInput,
  InputWithLabelRow,
} from '@common/components';
import { LocaleKey, useTranslation } from '@common/intl';
import {
  AssetLogReasonInput,
  AssetLogStatusInput,
  Box,
  InsertAssetLogInput,
  ReasonType,
  StatusType,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { AssetLogPanel } from '../Components';
import { parseLogReason, parseLogStatus, reasonsByStatus } from '../utils';

const Row = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <Box paddingTop={1.5}>
    <InputWithLabelRow
      labelWidth="200px"
      label={label}
      labelProps={{
        sx: { fontSize: '16px', paddingRight: 2, textAlign: 'right' },
      }}
      Input={
        <Box sx={{}} flex={1}>
          {children}
        </Box>
      }
    />
  </Box>
);

export const StatusTab = ({
  draft,
  onChange,
  value,
}: AssetLogPanel & {
  onChange: (patch: Partial<InsertAssetLogInput>) => void;
}) => {
  const t = useTranslation('coldchain');
  const debouncedOnChange = useDebounceCallback(
    (patch: Partial<InsertAssetLogInput>) => onChange(patch),
    [onChange],
    500
  );

  const getOption = (label: string, value?: string) => ({
    label,
    value: value ?? label,
  });

  const getOptionsFromEnum = (
    enumObject: Record<string, string>,
    parser: (value: never) => { key: LocaleKey } | undefined
  ) =>
    Object.values(enumObject).map(value => {
      if (value === undefined) return undefined;
      const parsed = parser(value as never);
      return parsed == undefined ? undefined : getOption(t(parsed.key), value);
    });

  const statuses = getOptionsFromEnum(StatusType, parseLogStatus);
  const reasons = getOptionsFromEnum(ReasonType, parseLogReason);
  const types = [
    getOption(t('label.cold-temperature-breach')),
    getOption(t('label.hot-temperature-breach')),
    getOption(t('label.maintenance-repair')),
    getOption(t('label.preventative-maintenance')),
  ];

  const filteredReasons = !draft.status
    ? reasons
    : reasons.filter(
        r =>
          reasonsByStatus[
            draft.status as keyof typeof reasonsByStatus
          ]?.includes(r?.value as never)
      );

  return (
    <AssetLogPanel value={value} draft={draft}>
      <Box display="flex" flexDirection="column" sx={{ width: '100%' }}>
        <Row label={t('label.type')}>
          <Autocomplete
            isOptionEqualToValue={option => option?.value === draft.type}
            onChange={(_e, selected) =>
              onChange({ type: selected?.value as string })
            }
            options={types}
            width="100%"
          />
        </Row>
        <Row label={t('label.new-functional-status')}>
          <Autocomplete
            isOptionEqualToValue={option => option?.value === draft.status}
            onChange={(_e, selected) =>
              onChange({
                status: selected?.value as AssetLogStatusInput,
                reason: undefined,
              })
            }
            options={statuses}
            width="100%"
          />
        </Row>
        <Row label={t('label.reason')}>
          <Autocomplete
            disabled={filteredReasons.length === 0}
            options={filteredReasons}
            width="100%"
            isOptionEqualToValue={option => option?.value === draft.reason}
            onChange={(_, selected) =>
              onChange({ reason: selected?.value as AssetLogReasonInput })
            }
            value={filteredReasons.find(r => r?.value === draft.reason) ?? null}
          />
        </Row>
        <Row label={t('label.observations')}>
          <BasicTextInput
            multiline
            rows={4}
            fullWidth
            onChange={e => debouncedOnChange({ comment: e.target.value })}
          />
        </Row>
      </Box>
    </AssetLogPanel>
  );
};
