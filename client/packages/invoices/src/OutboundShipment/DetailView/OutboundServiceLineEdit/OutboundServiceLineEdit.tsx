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
import { useOutbound } from '../../api';
import { useDraftServiceLines } from './useDraftServiceLines';
import { useServiceLineColumns } from './useServiceLineColumns';
import { ItemRowFragment, useItem } from '@openmsupply-client/system';

interface OutboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

const OutboundServiceLineEditComponent = ({
  isOpen,
  onClose,
}: OutboundServiceLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const isDisabled = useOutbound.utils.isDisabled();
  const { lines, update, add, save, isLoading } = useDraftServiceLines();
  const columns = useServiceLineColumns(update);
  const {
    serviceItem: { data: defaultServiceItem },
  } = useItem();

  const table = useSimpleMaterialTable({
    tableId: 'stocktake-batches',
    columns,
    data: lines.filter(({ isDeleted }) => !isDeleted),
    noDataElement: <NothingHere body={!defaultServiceItem
      ? t('error.no-service-charges')
      : t('error.no-results')} />,
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
              disabled={isDisabled || !defaultServiceItem}
              color="primary"
              variant="outlined"
              onClick={add}
              label={`${t('label.add-charge')}`}
              Icon={<PlusCircleIcon />}
            />
          </Box>
          {/* <TableProvider createStore={createTableStore}>
            <DataTable
              id="outbound-service-line"
              columns={columns}
              data={lines.filter(({ isDeleted }) => !isDeleted)}
              dense
              noDataMessage={
                !defaultServiceItem
                  ? t('error.no-service-charges')
                  : t('error.no-results')
              }
            />
          </TableProvider> */}

          <MaterialTable table={table} />
        </Box>
      )}
    </Modal>
  );
};

export const OutboundServiceLineEdit = (
  props: OutboundServiceLineEditProps
) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<ItemRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <OutboundServiceLineEditComponent {...props} />
  </QueryParamsProvider>
);
