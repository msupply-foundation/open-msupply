import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  SaveIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  useNotification,
  AppFooterPortal,
  ToggleButton,
  useNavigate,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getStocktakeStatuses,
  getNextStocktakeStatus,
  getStocktakeTranslator,
  isStocktakeEditable,
} from '../../utils';
import { StocktakeController } from '../../types';

interface StocktakeDetailFooterProps {
  draft: StocktakeController;
  save: () => Promise<void>;
}

const getNextStatusText = (
  draft: StocktakeController,
  t: ReturnType<typeof useTranslation>
) => {
  const nextStatus = getNextStocktakeStatus(draft.status);
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

export const Footer: FC<StocktakeDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation(['common', 'inventory']);
  const { success, error } = useNotification();

  return (
    <AppFooterPortal
      Content={
        draft && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <ToggleButton
              disabled={!isStocktakeEditable(draft)}
              value={!!draft.onHold}
              selected={!!draft.onHold}
              onClick={() => {
                draft.updateOnHold();
              }}
              label={t('label.hold')}
            />
            <StatusCrumbs
              statuses={getStocktakeStatuses()}
              statusLog={createStatusLog(draft.status)}
              statusFormatter={getStocktakeTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<XCircleIcon />}
                label={t('button.cancel')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigate(-1)}
              />
              {isStocktakeEditable(draft) && (
                <>
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    Icon={<SaveIcon />}
                    label={t('button.save')}
                    variant="contained"
                    color="secondary"
                    sx={{ fontSize: '12px' }}
                    onClick={() => {
                      success('Saved stocktake! 🥳 ')();
                      save();
                    }}
                  />
                  <ButtonWithIcon
                    disabled={draft.onHold}
                    shrinkThreshold="lg"
                    Icon={<ArrowRightIcon />}
                    label={t('button.save-and-confirm-status', {
                      status: getNextStatusText(draft, t),
                    })}
                    sx={{ fontSize: '12px' }}
                    variant="contained"
                    color="secondary"
                    onClick={async () => {
                      try {
                        await draft.updateStatus(
                          getNextStocktakeStatus(draft.status)
                        );
                        success('Saved stocktake! 🥳 ')();
                        save();
                      } catch (e) {
                        error('Could not save stocktake')();
                      }
                    }}
                  />
                </>
              )}
            </Box>
          </Box>
        )
      }
    />
  );
};
