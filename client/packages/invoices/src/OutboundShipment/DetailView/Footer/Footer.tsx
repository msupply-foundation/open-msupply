import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  ArrowLeftIcon,
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  DeleteIcon,
  ZapIcon,
  useTranslation,
  AppFooterPortal,
  useBreadcrumbs,
  useConfirmationModal,
  InvoiceLineNodeType,
  InvoiceNodeType,
  usePreferences,
} from '@openmsupply-client/common';
import { getStatusTranslator } from '../../../utils';
import { createStatusLog, getStatusSequence } from '../../../statuses';
import { useOutbound } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';
import { StockOutLineFragment } from 'packages/invoices/src/StockOut';

const outboundSequence = getStatusSequence(InvoiceNodeType.OutboundShipment);

interface FooterComponentProps {
  onReturnLines: (selectedLines: StockOutLineFragment[]) => void;
  selectedRows: StockOutLineFragment[];
  resetRowSelection: () => void;
}

export const FooterComponent: FC<FooterComponentProps> = ({
  onReturnLines,
  selectedRows,
  resetRowSelection,
}) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { invoiceStatusOptions } = usePreferences();

  const { data } = useOutbound.document.get();
  const onDelete = useOutbound.line.deleteSelected(
    selectedRows,
    resetRowSelection
  );
  const { onAllocate } = useOutbound.line.allocateSelected(
    selectedRows,
    resetRowSelection
  );

  const selectedUnallocatedEmptyLines = selectedRows
    .filter(
      ({ type, numberOfPacks }) =>
        type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks === 0
    )
    .flat()
    .map(row => row.id);

  const getConfirmation = useConfirmationModal({
    onConfirm: onAllocate,
    title: t('heading.are-you-sure'),
    message: t('messages.empty-unallocated-lines', {
      count: selectedUnallocatedEmptyLines.length,
    }),
  });

  const confirmAllocate = () => {
    if (selectedUnallocatedEmptyLines.length !== 0) {
      getConfirmation();
    } else {
      onAllocate();
    }
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
    },
    {
      label: t('button.allocate-lines'),
      icon: <ZapIcon />,
      onClick: confirmAllocate,
      shouldShrink: false,
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(selectedRows),
      shouldShrink: false,
    },
  ];

  const statuses = outboundSequence.filter(status =>
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
                statusLog={createStatusLog(data, outboundSequence)}
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
