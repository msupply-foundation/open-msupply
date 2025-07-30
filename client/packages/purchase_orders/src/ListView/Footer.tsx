import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { ListParams, usePurchaseOrderList } from '../api';

export const FooterComponent: FC<{ listParams: ListParams }> = ({
  listParams,
}) => {
  const t = useTranslation();

  const { selectedRows } = usePurchaseOrderList(listParams);

  // const confirmAndDelete = useDeleteConfirmation({
  //   selectedRows,
  //   deleteAction: async () => {},
  //   // canDelete: selectedRows.every(canDeletePrescription),
  //   messages: {
  //     confirmMessage: t('messages.confirm-delete-prescriptions', {
  //       count: selectedRows.length,
  //     }),
  //     deleteSuccess: t('messages.deleted-prescriptions', {
  //       count: selectedRows.length,
  //     }),
  //   },
  // });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: () => {
        // eslint-disable-next-line
        console.log('TO-DO: Delete purchase orders...');
      },
      // onClick: confirmAndDelete,
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
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
