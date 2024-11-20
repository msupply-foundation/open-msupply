import React from 'react';
import { Box, StatusType } from '@openmsupply-client/common';
import { LocaleKey, useTranslation } from '@common/intl';

const parseStatus = (
  status: StatusType
): { key: LocaleKey; colour: string } | undefined => {
  switch (status) {
    case StatusType.Decommissioned:
      return {
        key: 'status.decommissioned',
        colour: 'cceStatus.decommissioned',
      };
    case StatusType.Functioning:
      return {
        key: 'status.functioning',
        colour: 'cceStatus.functioning',
      };
    case StatusType.FunctioningButNeedsAttention:
      return {
        key: 'status.functioning-but-needs-attention',
        colour: 'cceStatus.functioningButNeedsAttention',
      };
    case StatusType.NotFunctioning:
      return {
        key: 'status.not-functioning',
        colour: 'cceStatus.notFunctioning',
      };
    case StatusType.NotInUse:
      return {
        key: 'status.not-in-use',
        colour: 'cceStatus.notInUse',
      };
    case StatusType.Unserviceable:
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
  status: StatusType | null | undefined;
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
