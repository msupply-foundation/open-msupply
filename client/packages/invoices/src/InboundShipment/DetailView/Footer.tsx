import {
  Box,
  ArrowRightIcon,
  ButtonWithIcon,
  SaveIcon,
  StatusCrumbs,
  ToggleButton,
  XCircleIcon,
  useTranslation,
  useNotification,
  AppFooterPortal,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNextInboundStatus,
  getNextInboundStatusButtonTranslation,
  getStatusTranslator,
  isInboundEditable,
  outboundStatuses,
} from '../../utils';
import { InboundShipment } from '../../types';

interface InboundDetailFooterProps {
  draft: InboundShipment;
  save: () => Promise<void>;
}

const createStatusLog = (draft: InboundShipment) => {
  const {
    entryDatetime,
    allocatedDatetime,
    shippedDatetime,
    pickedDatetime,
    deliveredDatetime,
  } = draft;

  return {
    DRAFT: entryDatetime,
    ALLOCATED: allocatedDatetime,
    SHIPPED: shippedDatetime,
    PICKED: pickedDatetime,
    DELIVERED: deliveredDatetime,
  };
};

export const Footer: FC<InboundDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation('common');
  const { success } = useNotification();

  const x = t('button.save-and-confirm-status', {
    status: t(getNextInboundStatusButtonTranslation(draft.status)),
  });

  console.log('-------------------------------------------');
  console.log('x', x);
  console.log('-------------------------------------------');

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <ToggleButton
            disabled={!isInboundEditable(draft)}
            value={!!draft.onHold}
            selected={!!draft.onHold}
            onClick={(_, value) => {
              draft.update?.('hold', !value);
            }}
            label={t('label.hold')}
          />

          <StatusCrumbs
            statuses={outboundStatuses}
            statusLog={createStatusLog(draft)}
            statusFormatter={getStatusTranslator(t)}
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
            {isInboundEditable(draft) && (
              <>
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  Icon={<SaveIcon />}
                  label={t('button.save')}
                  variant="contained"
                  color="secondary"
                  sx={{ fontSize: '12px' }}
                  onClick={() => {
                    success('Saved invoice! 🥳 ')();
                    save();
                  }}
                />
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  disabled={draft.onHold}
                  Icon={<ArrowRightIcon />}
                  label={t('button.save-and-confirm-status', {
                    status: t(
                      getNextInboundStatusButtonTranslation(draft.status)
                    ),
                  })}
                  sx={{ fontSize: '12px' }}
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    success('Saved invoice! 🥳 ')();
                    await draft.update?.(
                      'status',
                      getNextInboundStatus(draft?.status)
                    );

                    save();
                  }}
                />
              </>
            )}
          </Box>
        </Box>
      }
    />
  );
};
