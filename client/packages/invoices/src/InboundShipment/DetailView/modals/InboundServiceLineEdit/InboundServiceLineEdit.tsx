import React from 'react';
import {
  BasicSpinner,
  useNotification,
  ButtonWithIcon,
  Box,
  PlusCircleIcon,
  DataTable,
  useDialog,
  useTranslation,
  DialogButton,
  TableProvider,
  createTableStore,
  QueryParamsProvider,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { useInbound } from '../../../api';
import { useDraftServiceLines } from './useDraftServiceLines';
import { useServiceLineColumns } from './useServiceLineColumns';
import {
  ItemRowFragment,
  useDefaultServiceItem,
} from '@openmsupply-client/system';

interface InboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

const InboundServiceLineEditComponent = ({
  isOpen,
  onClose,
}: InboundServiceLineEditProps) => {
  const { error } = useNotification();
  const isDisabled = useInbound.utils.isDisabled();
  const { Modal } = useDialog({ isOpen, onClose });
  const { lines, update, add, save, isLoading } = useDraftServiceLines();
  const columns = useServiceLineColumns(update);
  const t = useTranslation('replenishment');
  const hasDefaultServiceItem = useDefaultServiceItem();

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
              disabled={isDisabled || !hasDefaultServiceItem.defaultServiceItem}
              color="primary"
              variant="outlined"
              onClick={add}
              label={`${t('label.add-charges')}`}
              Icon={<PlusCircleIcon />}
            />
          </Box>
          <TableProvider
            createStore={createTableStore()}
            queryParamsStore={createQueryParamsStore({
              initialSortBy: { key: 'serviceItemName' },
            })}
          >
            <DataTable
              id="inbound-detail-service-line"
              columns={columns}
              data={lines.filter(({ isDeleted }) => !isDeleted)}
              dense
              noDataMessage={
                !hasDefaultServiceItem.defaultServiceItem
                  ? t('error.no-service-charges')
                  : t('error.no-results')
              }
            />
          </TableProvider>
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
