import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  useTranslation,
  useNotification,
  AppFooterPortal,
  ToggleButton,
  StocktakeNodeStatus,
  useBufferState,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getStocktakeStatuses,
  getNextStocktakeStatus,
  getStocktakeTranslator,
} from '../../utils';

import { useStocktakeFields, useIsStocktakeDisabled } from '../api';

const getNextStatusText = (
  status: StocktakeNodeStatus,
  t: ReturnType<typeof useTranslation>
) => {
  const nextStatus = getNextStocktakeStatus(status);
  const translation = getStocktakeTranslator(t)(nextStatus);
  return translation;
};

const createStatusLog = (status: 'SUGGESTED' | 'FINALISED') => {
  if (status === 'SUGGESTED') {
    return {
      SUGGESTED: new Date().toISOString(),
      FINALISED: null,
    };
  }

  return {
    SUGGESTED: new Date().toISOString(),
    FINALISED: new Date().toISOString(),
  };
};

export const Footer: FC = () => {
  const t = useTranslation(['common', 'inventory']);
  const { success, error } = useNotification();
  const isDisabled = useIsStocktakeDisabled();
  const { status, onHold, update } = useStocktakeFields(['status', 'onHold']);
  const [onHoldBuffer, setOnHoldBuffer] = useBufferState(onHold);

  return (
    <AppFooterPortal
      Content={
        status && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <ToggleButton
              disabled={isDisabled}
              value={onHoldBuffer}
              selected={onHoldBuffer}
              onClick={(_, value) => {
                setOnHoldBuffer(!value);
                update({ onHold: !value });
              }}
              label={t('label.hold')}
            />
            <StatusCrumbs
              statuses={getStocktakeStatuses()}
              statusLog={createStatusLog(status)}
              statusFormatter={getStocktakeTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              {!isDisabled && (
                <ButtonWithIcon
                  disabled={onHoldBuffer}
                  shrinkThreshold="lg"
                  Icon={<ArrowRightIcon />}
                  label={t('button.save-and-confirm-status', {
                    status: getNextStatusText(status, t),
                    ns: 'inventory',
                  })}
                  sx={{ fontSize: '12px' }}
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    try {
                      await update({
                        status: getNextStocktakeStatus(status),
                      });
                      success('Saved stocktake! 🥳 ')();
                    } catch (e) {
                      error('Could not save stocktake')();
                    }
                  }}
                />
              )}
            </Box>
          </Box>
        )
      }
    />
  );
};
