import React, { ReactElement } from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  XCircleIcon,
  useBreadcrumbs,
  ArrowLeftIcon,
  DeleteIcon,
  RewindIcon,
  Action,
  ActionsFooter,
  ArrowRightIcon,
  useEditModal,
  useNotification,
  useDisabledNotificationToast,
  usePreferences,
  useIsExtraSmallScreen,
  CheckIcon,
  CloseIcon,
  ClockIcon,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { ChangeCampaignOrProgramConfirmationModal } from '@openmsupply-client/system';
import { getStatusTranslator, getInboundShipmentType } from '../../../utils';
import { createStatusLog, getStatusSequence } from '../../../statuses';
import { InboundLineFragment, useInboundShipment } from '../../api';
import {
  useInboundDeleteSelectedLines,
  useZeroInboundLinesQuantity,
  useSaveInboundLines,
  useChangeStatusOfInboundLines,
} from '../../api/hooks/utils';
import { OnHoldButton } from './OnHoldButton';
import { StatusChangeButton } from './StatusChangeButton';

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
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const {
    query: { data },
  } = useInboundShipment();

  if (!data) return null;

  const shipmentType = getInboundShipmentType(data);
  const statuses = getStatusSequence(InvoiceNodeType.InboundShipment, {
    inboundShipmentType: shipmentType,
  }).filter(status =>
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
      {!isExtraSmallScreen && <OnHoldButton />}
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
  );
};

interface FooterComponentProps {
  onReturnLines: () => void;
  selectedRows: InboundLineFragment[];
  resetRowSelection: () => void;
  showLineStatus: boolean;
}

export const FooterComponent = ({
  onReturnLines,
  selectedRows,
  resetRowSelection,
  showLineStatus,
}: FooterComponentProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const changeCampaignOrProgramModal = useEditModal();

  const {
    query: { data },
    isDisabled,
    isExternal,
    hasAuthorisePermission,
  } = useInboundShipment();
  const permissionDeniedNotification = useDisabledNotificationToast(
    t('auth.permission-denied')
  );
  const onDelete = useInboundDeleteSelectedLines(
    selectedRows,
    resetRowSelection
  );
  const onZeroQuantities = useZeroInboundLinesQuantity(
    selectedRows,
    resetRowSelection
  );
  const { mutateAsync } = useSaveInboundLines(isExternal);
  const onChangeLineStatus = useChangeStatusOfInboundLines(
    selectedRows,
    resetRowSelection
  );

  const handleCampaignClick = () => {
    if (isDisabled) {
      info(
        t('messages.cant-change-campaign-or-program-on-finalised-invoice')
      )();
    } else {
      changeCampaignOrProgramModal.onOpen();
    }
  };

  const changeLineStatus = (status: 'approve' | 'reject' | 'pending') => {
    if (!selectedRows.length) {
      const selectLinesSnack = info(t(`messages.select-rows-to-${status}`));
      selectLinesSnack();
      return;
    }

    if (data?.status === InvoiceNodeStatus.Received || isDisabled) {
      info(t('messages.cant-change-line-status-on-received-invoice'))();
      return;
    }

    if (
      (status === 'approve' || status === 'reject') &&
      !hasAuthorisePermission
    ) {
      return permissionDeniedNotification();
    }

    onChangeLineStatus(status);
  };

  let actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      testId: 'delete-lines-button',
    },
    {
      label: t('button.change-campaign-or-program'),
      icon: <ArrowRightIcon />,
      onClick: handleCampaignClick,
      shouldShrink: false,
      testId: 'change-campaign-button',
    },
    {
      label: t('button.zero-line-quantity'),
      icon: <RewindIcon />,
      onClick: onZeroQuantities,
      shouldShrink: false,
      testId: 'zero-quantity-button',
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(),
      shouldShrink: false,
      testId: 'return-lines-button',
    },
  ];
  if (showLineStatus) {
    actions = actions.concat([
      {
        label: t('button.approve'),
        icon: <CheckIcon />,
        onClick: () => changeLineStatus('approve'),
        testId: 'approve-lines-button',
      },
      {
        label: t('button.reject'),
        icon: <CloseIcon />,
        onClick: () => changeLineStatus('reject'),
        testId: 'reject-lines-button',
      },
      {
        label: t('button.pending'),
        icon: <ClockIcon />,
        onClick: () => changeLineStatus('pending'),
        testId: 'pending-lines-button',
      },
    ]);
  }

  // Only mount the footer portal when there's a selection. Otherwise leave the
  // slot free so the parent `AppFooterStatusPortal` (status crumbs) shows
  // through. The campaign-change confirmation modal is opened from one of the
  // row actions but renders via its own portal, so it can stay mounted
  // outside the conditional.
  return (
    <>
      {selectedRows.length !== 0 && (
        <AppFooterPortal
          Content={
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          }
        />
      )}
      {changeCampaignOrProgramModal.isOpen && (
        <ChangeCampaignOrProgramConfirmationModal
          isOpen={changeCampaignOrProgramModal.isOpen}
          onCancel={changeCampaignOrProgramModal.onClose}
          clearSelected={resetRowSelection}
          rows={selectedRows}
          onChange={mutateAsync}
        />
      )}
    </>
  );
};

export const Footer = React.memo(FooterComponent);
