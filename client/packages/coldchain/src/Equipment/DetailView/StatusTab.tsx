import React from 'react';
import {
  Autocomplete,
  BasicTextInput,
  InputWithLabelRow,
} from '@common/components';
import { LocaleKey, useTranslation } from '@common/intl';
import {
  AssetLogStatusInput,
  Box,
  InsertAssetLogInput,
  StatusType,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { AssetLogPanel } from '../Components';
import { parseLogStatus } from '../utils';
import { useAssetData } from '@openmsupply-client/system';

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

export const StatusTab = ({ draft, onChange, value }: AssetLogPanel) => {
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
  const { data } = useAssetData.log.listReasons(
    draft.status
      ? {
          assetLogStatus: { equalTo: draft.status },
        }
      : undefined
  );

  const reasons =
    data?.nodes?.map(value => {
      return {
        label: value.reason,
        value: value.id,
      };
    }) ?? [];

  return (
    <AssetLogPanel value={value} draft={draft} onChange={onChange}>
      <Box display="flex" flexDirection="column" sx={{ width: '100%' }}>
        <Row label={t('label.new-functional-status')}>
          <Autocomplete
            isOptionEqualToValue={option => option?.value === draft.status}
            onChange={(_e, selected) =>
              onChange({
                status: selected?.value as AssetLogStatusInput,
                reasonId: undefined,
              })
            }
            options={statuses}
            width="100%"
          />
        </Row>
        <Row label={t('label.reason')}>
          <Autocomplete
            disabled={reasons.length === 0}
            options={reasons}
            width="100%"
            isOptionEqualToValue={option => option?.value === draft.reasonId}
            onChange={(_e, selected) =>
              onChange({ reasonId: selected?.value as string })
            }
            value={reasons.find(r => r?.value === draft.reasonId) ?? null}
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
