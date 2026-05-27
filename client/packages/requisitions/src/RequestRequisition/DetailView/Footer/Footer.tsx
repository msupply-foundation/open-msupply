import React, { ReactElement } from 'react';
import {
  Box,
  StatusCrumbs,
  AppFooterPortal,
  RequisitionNodeStatus,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
} from '@openmsupply-client/common';
import { getRequisitionTranslator, requestStatuses } from '../../../utils';
import { RequestFragment, RequestLineFragment, useRequest } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: RequestFragment) => {
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.Draft]: requisition.createdDatetime,
    [RequisitionNodeStatus.Sent]: requisition.sentDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    // Keeping typescript happy, not used for request requisitions.
    [RequisitionNodeStatus.New]: null,
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
  const { data } = useRequest.document.get();

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
        statuses={requestStatuses}
        statusLog={createStatusLog(data)}
        statusFormatter={getRequisitionTranslator(t)}
      />

      <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
        <StatusChangeButton />
      </Box>
    </Box>
  );
};

export const Footer = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: RequestLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { confirmAndDelete } = useRequest.line.delete(
    selectedRows,
    resetRowSelection
  );

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
