import React from 'react';
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
  const { navigateUpOne } = useBreadcrumbs();
  const { info } = useNotification();
  const changeCampaignOrProgramModal = useEditModal();
  const { invoiceStatusOptions } = usePreferences();
  const isExtraSmallScreen = useIsExtraSmallScreen();

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
  const shipmentType = data ? getInboundShipmentType(data) : undefined;

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
    },
    {
      label: t('button.change-campaign-or-program'),
      icon: <ArrowRightIcon />,
      onClick: handleCampaignClick,
      shouldShrink: false,
    },
    {
      label: t('button.zero-line-quantity'),
      icon: <RewindIcon />,
      onClick: onZeroQuantities,
      shouldShrink: false,
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(),
      shouldShrink: false,
    },
  ];
  if (showLineStatus) {
    actions = actions.concat([
      {
        label: t('button.approve'),
        icon: <CheckIcon />,
        onClick: () => changeLineStatus('approve'),
      },
      {
        label: t('button.reject'),
        icon: <CloseIcon />,
        onClick: () => changeLineStatus('reject'),
      },
      {
        label: t('button.pending'),
        icon: <ClockIcon />,
        onClick: () => changeLineStatus('pending'),
      },
    ]);
  }
  const statuses = getStatusSequence(InvoiceNodeType.InboundShipment, {
    inboundShipmentType: shipmentType,
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
          {data && selectedRows.length === 0 ? (
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
          ) : null}
          {
            <ChangeCampaignOrProgramConfirmationModal
              isOpen={changeCampaignOrProgramModal.isOpen}
              onCancel={changeCampaignOrProgramModal.onClose}
              clearSelected={resetRowSelection}
              rows={selectedRows}
              onChange={mutateAsync}
            />
          }
        </>
      }
    />
  );
};

export const Footer = React.memo(FooterComponent);
