import React, { memo, ReactElement } from 'react';
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

/**
 * Status crumbs + on-hold/close/status-change buttons. Extracted so the parent
 * `DetailView` can render it through `AppFooterStatusPortal` on every tab —
 * the Details tab's own `Footer` only takes over to show row-selection
 * actions.
 */
export const StatusFooter = (): ReactElement | null => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { invoiceStatusOptions } = usePreferences();
  const { data } = useReturns.document.supplierReturn();

  if (!data) return null;

  const statuses = supplierReturnSequence.filter(status =>
    invoiceStatusOptions ? invoiceStatusOptions.includes(status) : true
  );

  return (
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
  );
};

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: SupplierReturnLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
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

  // Only mount the footer portal when there's a selection. Otherwise leave the
  // slot free so the parent `AppFooterStatusPortal` (status crumbs) shows
  // through.
  if (selectedRows.length === 0) return null;

  return (
    <AppFooterPortal
      Content={
        <ActionsFooter
          actions={actions}
          selectedRowCount={selectedRows.length}
          resetRowSelection={resetRowSelection}
        />
      }
    />
  );
};

export const Footer = memo(FooterComponent);
