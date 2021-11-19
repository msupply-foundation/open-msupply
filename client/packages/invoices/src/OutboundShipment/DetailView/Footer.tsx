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
  getNextOutboundStatus,
  getNextOutboundStatusButtonTranslation,
  getStatusTranslation,
  isInvoiceEditable,
  outboundStatuses,
} from '../../utils';
import { OutboundShipment } from '../../types';

interface OutboundDetailFooterProps {
  draft: OutboundShipment;
  save: () => Promise<void>;
}

const createStatusLog = (draft: OutboundShipment) => {
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

export const Footer: FC<OutboundDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation();
  const { success } = useNotification();

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
              disabled={!isInvoiceEditable(draft)}
              value={!!draft.onHold}
              selected={!!draft.onHold}
              onClick={(_, value) => {
                draft.update?.('hold', !value);
              }}
              labelKey="label.hold"
            />

            <StatusCrumbs
              statuses={outboundStatuses}
              statusLog={createStatusLog(draft)}
              statusFormatter={getStatusTranslation}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<XCircleIcon />}
                labelKey="button.cancel"
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={() => navigate(-1)}
              />
              {isInvoiceEditable(draft) && (
                <>
                  <ButtonWithIcon
                    shrinkThreshold="lg"
                    Icon={<SaveIcon />}
                    labelKey="button.save"
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
                    labelKey="button.save-and-confirm-status"
                    sx={{ fontSize: '12px' }}
                    labelProps={{
                      status: t(
                        getNextOutboundStatusButtonTranslation(draft.status)
                      ),
                    }}
                    variant="contained"
                    color="secondary"
                    onClick={async () => {
                      success('Saved invoice! 🥳 ')();
                      await draft.update?.(
                        'status',
                        getNextOutboundStatus(draft.status)
                      );

                      save();
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
