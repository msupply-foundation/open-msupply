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
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNextOutboundStatus,
  getNextOutboundStatusButtonTranslation,
  getStatusTranslator,
  isInvoiceEditable,
  outboundStatuses,
} from '../../utils';
import { OutboundShipment } from '../../types';

interface OutboundDetailFooterProps {
  draft: OutboundShipment;
  save: () => Promise<void>;
}

const createStatusLog = (draft: OutboundShipment) => {
  const statusIdx = outboundStatuses.findIndex(s => draft.status === s);

  const statusLog = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = draft.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Allocated] = draft.allocatedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Picked] = draft.pickedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Shipped] = draft.shippedDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Picked] = draft.deliveredDatetime;
  }
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Picked] = draft.verifiedDatetime;
  }

  return statusLog;
};

export const Footer: FC<OutboundDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation('common');
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
                draft.update?.('onHold', !value);
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
              {isInvoiceEditable(draft) && (
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
                        getNextOutboundStatusButtonTranslation(draft.status)
                      ),
                    })}
                    sx={{ fontSize: '12px' }}
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
