import React from 'react';
import { Autocomplete, InputWithLabelRow } from '@common/components';
import { LocaleKey, useTranslation } from '@common/intl';
import { Box, ReasonType, StatusType } from '@openmsupply-client/common';
import { AssetLogPanel } from '../Components';
import { AssetLogFragment } from '../api';
import { parseLogReason, parseLogStatus } from '../utils';

const Row = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <Box paddingTop={1.5}>
    <InputWithLabelRow
      labelWidth="150px"
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
  onChange: (patch: Partial<AssetLogFragment>) => void;
}) => {
  const t = useTranslation('coldchain');
  const getOptionsFromEnum = (
    enumObject: any,
    parser: (value: any) => { key: LocaleKey } | undefined
  ) =>
    Object.values(enumObject).map(value => {
      const parsed = parser(value);
      return parsed == undefined
        ? undefined
        : {
            label: t(parsed.key),
            value,
          };
    });

  const types = getOptionsFromEnum(StatusType, parseLogStatus);
  const reasons = getOptionsFromEnum(ReasonType, parseLogReason);

  return (
    <AssetLogPanel value={value} draft={draft}>
      <Box
        display="flex"
        flexDirection="column"
        padding={2}
        paddingRight={4}
        sx={{ maxWidth: '600px', width: '100%' }}
      >
        <Row label={t('label.type')}>
          <Autocomplete
            options={types}
            fullWidth
            onChange={(_e, selected) =>
              onChange({ type: selected?.value as string })
            }
          />
        </Row>
        <Row label={t('label.reason')}>
          <Autocomplete
            options={reasons}
            fullWidth
            onChange={(_e, selected) =>
              onChange({ reason: selected?.value as ReasonType })
            }
          />
        </Row>
      </Box>
    </AssetLogPanel>
  );
};
