import React, { FC } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useTranslation,
  RouteBuilder,
  DeleteIcon,
  RequisitionNodeStatus,
  useDeleteConfirmation,
  useNavigate,
  usePluginProvider,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OrderInfoSection } from './OrderInfoSection';
import { AdditionalInfoSection, PricingSectionComponent, ProgramInfoSection, RelatedDocumentsSection } from '../../common';

export const SidePanel: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success } = useNotification();
  const { mutateAsync } = useRequest.document.delete();
  const { data } = useRequest.document.get();
  const { plugins } = usePluginProvider();
  const canDelete = data?.status === RequisitionNodeStatus.Draft;

  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync([data]);
    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InternalOrder)
        .build()
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-requisition', {
        number: data?.requisitionNumber,
      }),
      deleteSuccess: t('messages.deleted-orders', {
        count: 1,
      }),
    },
  });

  return (
    <DetailPanelPortal
      Actions={
        <>
          <DetailPanelAction
            icon={<DeleteIcon />}
            title={t('label.delete')}
            onClick={onDelete}
            disabled={!canDelete}
          />
          <DetailPanelAction
            icon={<CopyIcon />}
            title={t('link.copy-to-clipboard')}
            onClick={copyToClipboard}
          />
        </>
      }
    >
      <OrderInfoSection />
      <ProgramInfoSection {...useRequest.document.fields(['orderType', 'programName', 'period'])} />
      <AdditionalInfoSection
        isDisabled={useRequest.utils.isDisabled()}
        {...useRequest.document.fields(['colour', 'comment', 'createdDatetime', 'user'])}
      />
      <RelatedDocumentsSection inbound {...useRequest.document.fields(['shipments', 'createdFromRequisition'])} />
      <PricingSectionComponent {...useRequest.document.fields('lines')} />
      {data &&
        plugins.requestRequisition?.sidePanelSection?.map((Plugin, index) => (
          <Plugin key={index} requisition={data} />
        ))}
    </DetailPanelPortal>
  );
};
