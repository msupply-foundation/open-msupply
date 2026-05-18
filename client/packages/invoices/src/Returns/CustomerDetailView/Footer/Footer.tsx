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
  CustomerReturnLineFragment,
  useReturns,
} from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: CustomerReturnLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { navigateUpOne } = useBreadcrumbs();
  const { data } = useReturns.document.customerReturn();
  const { id } = data ?? { id: '' };

  const confirmAndDelete = useReturns.lines.deleteSelectedCustomerLines({
    returnId: id,
    selectedRows,
    resetRowSelection,
  });

  const isManuallyCreated = !data?.linkedShipment?.id;

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const statuses = getStatusSequence(InvoiceNodeType.CustomerReturn, {
    isManuallyCreated,
  }).filter(status =>
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
                statusLog={createStatusLog(data, statuses)}
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
