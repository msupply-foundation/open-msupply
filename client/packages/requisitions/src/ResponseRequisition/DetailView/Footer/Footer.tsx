import React, { ReactElement } from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  RequisitionNodeStatus,
  Action,
  DeleteIcon,
  ActionsFooter,
} from '@openmsupply-client/common';
import { responseStatuses, getRequisitionTranslator } from '../../../utils';
import { ResponseFragment, ResponseLineFragment, useResponse } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: ResponseFragment) => {
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.New]: requisition.createdDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    // Keeping typescript happy, not used for response requisitions.
    [RequisitionNodeStatus.Draft]: null,
    [RequisitionNodeStatus.Sent]: null,
  };

  return statusLog;
};

/**
 * Status crumbs + status-change button. Extracted so the parent `DetailView`
 * can render it through `AppFooterStatusPortal` on every tab — the Details
 * tab's own `Footer` only takes over to show row-selection actions.
 */
export const StatusFooter = (): ReactElement | null => {
  const t = useTranslation();
  const { data } = useResponse.document.get();

  if (!data) return null;

  return (
    <Box
      gap={2}
      display="flex"
      flexDirection="row"
      alignItems="center"
      height={64}
    >
      <StatusCrumbs
        statuses={responseStatuses}
        statusLog={createStatusLog(data)}
        statusFormatter={getRequisitionTranslator(t)}
      />

      <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
        <StatusChangeButton requisition={data} />
      </Box>
    </Box>
  );
};

export const Footer = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: ResponseLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { confirmAndDelete } = useResponse.line.delete(
    selectedRows,
    resetRowSelection
  );

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
      testId: 'delete-lines-button',
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
