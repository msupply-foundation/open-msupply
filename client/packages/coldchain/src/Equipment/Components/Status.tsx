import React from 'react';
import { Box, AssetLogStatusNodeType } from '@openmsupply-client/common';
import { LocaleKey, useTranslation } from '@common/intl';

const parseStatus = (
  status: AssetLogStatusNodeType
): { key: LocaleKey; colour: string } | undefined => {
  switch (status) {
    case AssetLogStatusNodeType.Decommissioned:
      return {
        key: 'status.decommissioned',
        colour: 'cceStatus.decommissioned',
      };
    case AssetLogStatusNodeType.Functioning:
      return {
        key: 'status.functioning',
        colour: 'cceStatus.functioning',
      };
    case AssetLogStatusNodeType.FunctioningButNeedsAttention:
      return {
        key: 'status.functioning-but-needs-attention',
        colour: 'cceStatus.functioningButNeedsAttention',
      };
    case AssetLogStatusNodeType.NotFunctioning:
      return {
        key: 'status.not-functioning',
        colour: 'cceStatus.notFunctioning',
      };
    case AssetLogStatusNodeType.NotInUse:
      return {
        key: 'status.not-in-use',
        colour: 'cceStatus.notInUse',
      };
    case AssetLogStatusNodeType.Unserviceable:
      return {
        key: 'status.unserviceable',
        colour: 'cceStatus.unserviceable',
      };
    default:
      console.warn(`Unknown equipment status: ${status}`);
  }
};

export const Status = ({
  status,
}: {
  status: AssetLogStatusNodeType | null | undefined;
}) => {
  const t = useTranslation();

  if (!status) return null;

  const parsed = parseStatus(status);

  if (!parsed) return null;

  return (
    <Box
      sx={{
        backgroundColor: parsed.colour,
        borderRadius: 4,
        color: 'cceStatus.text',
        fontWeight: 'bold',
        textAlign: 'center',
      }}
      paddingY={0.25}
      paddingX={1}
    >
      {t(parsed.key)}
    </Box>
  );
};
