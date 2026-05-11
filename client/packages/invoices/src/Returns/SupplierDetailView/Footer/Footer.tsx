import React, { memo } from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  AppFooterPortal,
  useBreadcrumbs,
  Action,
  DeleteIcon,
  ActionsFooter,
  usePreferences,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { getStatusTranslator } from '../../../utils';
import { createStatusLog, getStatusSequence } from '../../../statuses';
import {
  SupplierReturnLineFragment,
  useReturns,
} from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';

const supplierReturnSequence = getStatusSequence(
  InvoiceNodeType.SupplierReturn
);

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: SupplierReturnLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { invoiceStatusOptions } = usePreferences();
  const { data } = useReturns.document.supplierReturn();
  const { id } = data ?? { id: '' };
  const { confirmAndDelete } = useReturns.lines.deleteSelectedSupplierLines({
    returnId: id,
    selectedRows,
    resetRowSelection,
  });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const statuses = supplierReturnSequence.filter(status =>
    invoiceStatusOptions ? invoiceStatusOptions.includes(status) : true
  );

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          )}
          {data && selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <OnHoldButton />
              <StatusCrumbs
                statuses={statuses}
                statusLog={createStatusLog(data, supplierReturnSequence)}
                statusFormatter={getStatusTranslator(t)}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  Icon={<XCircleIcon />}
                  label={t('button.close')}
                  color="secondary"
                  sx={{ fontSize: '12px' }}
                  onClick={() => navigateUpOne()}
                />
                <StatusChangeButton />
              </Box>
            </Box>
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
