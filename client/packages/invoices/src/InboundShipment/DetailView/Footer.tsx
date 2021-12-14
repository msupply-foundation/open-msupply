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
  useNavigate,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import {
  getNextInboundStatus,
  getNextInboundStatusButtonTranslation,
  getStatusTranslator,
  isInboundEditable,
  inboundStatuses,
} from '../../utils';
import { InboundShipment } from '../../types';

interface InboundDetailFooterProps {
  draft: InboundShipment;
  save: () => Promise<void>;
}

const createStatusLog = (draft: InboundShipment) => {
  const statusIdx = inboundStatuses.findIndex(s => draft.status === s);
  const statusLog = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
    // Placeholder for typescript, not used in inbounds
    [InvoiceNodeStatus.Allocated]: null,
  };

  statusLog;

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = draft.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Picked] = draft.pickedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Shipped] = draft.shippedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Picked] = draft.deliveredDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Picked] = draft.verifiedDatetime;
  }

  return statusLog;
};

export const Footer: FC<InboundDetailFooterProps> = ({ draft, save }) => {
  const navigate = useNavigate();
  const t = useTranslation('common');
  const { success } = useNotification();

  return (
    <AppFooterPortal
      Content={
        !!draft && (
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
                draft.update?.('onHold', !value);
              }}
              label={t('label.hold')}
            />

            <StatusCrumbs
              statuses={inboundStatuses}
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
        )
      }
    />
  );
};
