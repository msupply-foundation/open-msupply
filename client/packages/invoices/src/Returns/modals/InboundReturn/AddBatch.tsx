import React, { useEffect } from 'react';
import {
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
  Box,
} from '@openmsupply-client/common';
import { useReturns } from '../..';

export const AddBatchButton = ({
  addDraftLine,
}: {
  addDraftLine: () => void;
}) => {
  const t = useTranslation(['distribution']);
  const isDisabled = useReturns.utils.inboundIsDisabled();

  return (
    <Box flex={1} justifyContent="flex-end" display="flex">
      <ButtonWithIcon
        disabled={isDisabled}
        color="primary"
        variant="outlined"
        onClick={addDraftLine}
        label={`${t('label.add-batch')} (+)`}
        Icon={<PlusCircleIcon />}
      />
    </Box>
  );
};

export const useAddBatchKeyBinding = (
  addDraftLine: (() => void) | undefined
) => {
  useEffect(() => {
    const keyBinding = (e: KeyboardEvent) => {
      if (addDraftLine && e.key === '+') {
        e.preventDefault();
        addDraftLine();
      }
    };

    window.addEventListener('keydown', keyBinding);
    return () => window.removeEventListener('keydown', keyBinding);
  }, [addDraftLine]);
};
