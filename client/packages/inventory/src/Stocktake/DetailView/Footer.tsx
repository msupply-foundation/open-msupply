import React, { FC } from 'react';
import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  StatusCrumbs,
  useTranslation,
  useNotification,
  AppFooterPortal,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';
import {
  getStocktakeStatuses,
  getNextStocktakeStatus,
  getStocktakeTranslator,
} from '../../utils';
import {
  StocktakeFragment,
  useStocktakeFields,
  useStocktake,
  useIsStocktakeDisabled,
} from '../api';

const getNextStatusText = (
  status: StocktakeNodeStatus,
  t: ReturnType<typeof useTranslation>
) => {
  const nextStatus = getNextStocktakeStatus(status);
  const translation = getStocktakeTranslator(t)(nextStatus);
  return translation;
};

const createStatusLog = (stocktake: StocktakeFragment) => {
  return {
    [StocktakeNodeStatus.New]: stocktake.createdDatetime,
    [StocktakeNodeStatus.Finalised]: stocktake.finalisedDatetime,
  };
};

export const Footer: FC = () => {
  const t = useTranslation(['common', 'inventory']);
  const { data } = useStocktake();
  const { success, error } = useNotification();
  const isDisabled = useIsStocktakeDisabled();
  const { status, update } = useStocktakeFields('status');

  return (
    <AppFooterPortal
      Content={
        data && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <StatusCrumbs
              statuses={getStocktakeStatuses()}
              statusLog={createStatusLog(data)}
              statusFormatter={getStocktakeTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              {!isDisabled && (
                <ButtonWithIcon
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
