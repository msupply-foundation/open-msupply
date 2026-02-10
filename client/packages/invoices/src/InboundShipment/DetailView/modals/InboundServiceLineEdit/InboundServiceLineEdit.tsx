import React from 'react';
import {
  BasicSpinner,
  useNotification,
  ButtonWithIcon,
  Box,
  PlusCircleIcon,
  useDialog,
  useTranslation,
  DialogButton,
  MaterialTable,
  useSimpleMaterialTable,
} from '@openmsupply-client/common';
import { useInbound } from '../../../api';
import { useDraftServiceLines } from './useDraftServiceLines';
import { useItem } from '@openmsupply-client/system';
import { useServiceLineColumns } from '@openmsupply-client/invoices/src/OutboundShipment/DetailView/OutboundServiceLineEdit/useServiceLineColumns';

interface InboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InboundServiceLineEdit = ({
  isOpen,
  onClose,
}: InboundServiceLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const isDisabled = useInbound.utils.isDisabled();
  const { lines, update, add, save, isLoading } = useDraftServiceLines();
  const columns = useServiceLineColumns(update);
  const {
    serviceItem: { data: serviceItem },
  } = useItem();

  const linesFiltered = lines.filter(({ isDeleted }) => !isDeleted);

  const table = useSimpleMaterialTable({
    tableId: 'inbound-detail-service-line',
    columns,
    data: linesFiltered,
  });

  return (
    <Modal
      title={t('heading.service-charges')}
      width={900}
      height={300}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await save();
              onClose();
            } catch {
              error(t('error.failed-to-save-service-charges'))();
            }
          }}
        />
      }
    >
      {isLoading ? (
        <BasicSpinner messageKey="loading" />
      ) : (
        <Box height={300}>
          <Box
            flex={1}
            marginBottom={1}
            justifyContent="flex-end"
            display="flex"
          >
            <ButtonWithIcon
              disabled={isDisabled || !serviceItem}
              color="primary"
              variant="outlined"
              onClick={add}
              label={`${t('label.add-charges')}`}
              Icon={<PlusCircleIcon />}
            />
          </Box>
          {linesFiltered.length > 0
            ? <MaterialTable table={table} />
            : (!serviceItem ? t('error.no-service-charges') : t('error.no-results'))}
        </Box>
      )}
    </Modal>
  );
};
