import React from 'react';
import {
  BufferedTextArea,
  BufferedTextInput,
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
  RnRFormNodeStatus,
  RouteBuilder,
  useDeleteConfirmation,
  useFormatDateTime,
  useNavigate,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useRnRForm } from '../api';
import { useDeleteRnRForm } from '../api/hooks/useDeleteRnRForm';

export const SidePanel = ({ rnrFormId }: { rnrFormId: string }) => {
  const t = useTranslation();
  const { success } = useNotification();
  const { localisedDate } = useFormatDateTime();
  const navigate = useNavigate();
  const {
    query: { data },
    bufferedDetails,
    updateRnRForm,
  } = useRnRForm({ rnrFormId });
  const { deleteRnRForms } = useDeleteRnRForm();
  const canDelete = data?.status === RnRFormNodeStatus.Draft;

  const deleteAction = async () => {
    if (!data) return;
    await deleteRnRForms([data.id]);
    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.RnRForms)
        .build()
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data ?? {}, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-rnr-form', {
        programName: data?.programName,
        period: data?.periodName,
      }),
      deleteSuccess: t('messages.deleted-rnr-form', {
        count: 1,
      }),
    },
  });

  if (!data) return null;

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
      <DetailPanelSection title={t('heading.additional-info')}>
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.program-name')}</PanelLabel>
            <PanelField>{data.programName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.period')}</PanelLabel>
            <PanelField>{data.periodName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.supplier')}</PanelLabel>
            <PanelField>{data.supplierName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.created')}</PanelLabel>
            <PanelField>{localisedDate(data.createdDatetime)}</PanelField>
          </PanelRow>
        </Grid>

        <Grid container gap={1} marginTop={2}>
          <PanelRow>
            <PanelLabel flex={0.5}>{t('heading.reference')}</PanelLabel>
            <PanelField>
              <BufferedTextInput
                disabled={data.status === RnRFormNodeStatus.Finalised}
                onChange={e =>
                  updateRnRForm({ theirReference: e.target.value })
                }
                value={bufferedDetails?.theirReference ?? ''}
                slotProps={{
                  input: {
                    sx: {
                      backgroundColor: theme => theme.palette.background.white,
                    },
                  },
                }}
              />
            </PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel flex={0.5}>{t('heading.comment')}</PanelLabel>
            <PanelField>
              <BufferedTextArea
                disabled={data.status === RnRFormNodeStatus.Finalised}
                onChange={e => updateRnRForm({ comment: e.target.value })}
                value={bufferedDetails?.comment ?? ''}
              />
            </PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
