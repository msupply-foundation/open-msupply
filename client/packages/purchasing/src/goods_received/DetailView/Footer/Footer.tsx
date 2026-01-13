import React, { ReactElement } from 'react';
import {
  Box,
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
  GoodsReceivedNodeStatus,
  StatusCrumbs,
} from '@openmsupply-client/common';
import { useGoodsReceived } from '../../api/hooks/useGoodsReceived';
import { getStatusTranslator, goodsReceivedStatuses } from './utils';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (goodsReceived: {
  createdDatetime: string;
  finalisedDatetime?: string | null;
}) => {
  const statusLog: Record<GoodsReceivedNodeStatus, null | undefined | string> =
    {
      [GoodsReceivedNodeStatus.New]: goodsReceived.createdDatetime,
      [GoodsReceivedNodeStatus.Finalised]:
        goodsReceived.finalisedDatetime ?? null,
    };
  return statusLog;
};

interface FooterProps {
  showStatusBar?: boolean;
}

export const Footer = ({ showStatusBar = true }: FooterProps): ReactElement => {
  const t = useTranslation();
  const {
    query: { data },
  } = useGoodsReceived();

  const selectedRows = []; // TODO: Implement proper row selection when lines are implemented
  const confirmAndDelete = () => {}; // TODO: Implement delete functionality

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={() => {}} // TODO: Implement row selection reset
            />
          )}
          {data && selectedRows.length === 0 && showStatusBar ? (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={goodsReceivedStatuses}
                statusLog={createStatusLog(data)}
                statusFormatter={getStatusTranslator(t)}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton />
              </Box>
            </Box>
          ) : null}
        </>
      }
    />
  );
};
