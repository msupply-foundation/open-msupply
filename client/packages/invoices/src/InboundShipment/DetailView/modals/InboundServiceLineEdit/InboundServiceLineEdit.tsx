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
  QueryParamsProvider,
  createQueryParamsStore,
  MaterialTable,
  useSimpleMaterialTable,
  NothingHere,
} from '@openmsupply-client/common';
import { useInbound } from '../../../api';
import { useDraftServiceLines } from './useDraftServiceLines';
import { useServiceLineColumns } from './useServiceLineColumns';
import { ItemRowFragment, useItem } from '@openmsupply-client/system';

interface InboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

const InboundServiceLineEditComponent = ({
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

  const table = useSimpleMaterialTable({
    tableId: 'inbound-detail-service-line',
    columns,
    data: lines.filter(({ isDeleted }) => !isDeleted),
    noDataElement: <NothingHere body={!serviceItem ? t('error.no-service-charges') : t('error.no-results')} />,
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
          <MaterialTable table={table} />
        </Box>
      )}
    </Modal>
  );
};

export const InboundServiceLineEdit = (props: InboundServiceLineEditProps) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<ItemRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <InboundServiceLineEditComponent {...props} />
  </QueryParamsProvider>
);
