import {
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
} from '@openmsupply-client/common';
import React, { FC } from 'react';

// Based off purchase order, but to be updated for Goods Received
// const createStatusLog = (
//   GoodsReceived: GoodsReceivedFragment,
//   requiresAuthorisation: boolean
// ) => {
//   const statusLog: Record<GoodsReceivedNodeStatus, null | undefined | string> =
//     {
//       [GoodsReceivedNodeStatus.New]: GoodsReceived.createdDatetime,
//       [GoodsReceivedNodeStatus.Authorised]: requiresAuthorisation
//         ? GoodsReceived.authorisedDatetime
//         : null,
//       [GoodsReceivedNodeStatus.Confirmed]: GoodsReceived.confirmedDatetime,
//       [GoodsReceivedNodeStatus.Finalised]: GoodsReceived.finalisedDatetime,
//     };

//   return statusLog;
// };

export const Footer: FC = () => {
  const t = useTranslation();

  const selectedRows = [];
  const confirmAndDelete = () => {};

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
            />
          )}
          {/* Add StatusCrumbs and StatusChange Button if neeed */}
        </>
      }
    />
  );
};
