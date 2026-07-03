import React from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useBufferState,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  DeleteIcon,
  useDeleteConfirmation,
  useFormatDateTime,
  useNavigate,
  RouteBuilder,
  UNDEFINED_STRING_VALUE,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import {
  StockMovementFragment,
  useDeleteStockMovement,
  useUpdateStockMovement,
} from '../api';
import { canDeleteStockMovement, isStockMovementDisabled } from '../utils';

interface SidePanelProps {
  movement: StockMovementFragment;
}

const AdditionalInfoSection = ({ movement }: SidePanelProps) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const { update } = useUpdateStockMovement();
  const [bufferedComment, setBufferedComment] = useBufferState(
    movement.comment ?? ''
  );
  const isDisabled = isStockMovementDisabled(movement.status);

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.number')}</PanelLabel>
          <PanelField>{String(movement.stockMovementNumber)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>
            {movement.user?.username ?? UNDEFINED_STRING_VALUE}
          </PanelField>
          {movement.user?.email ? (
            <InfoTooltipIcon title={movement.user.email} />
          ) : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.created')}</PanelLabel>
          <PanelField>{localisedDate(movement.createdDatetime)}</PanelField>
        </PanelRow>
        {movement.finalisedDatetime && (
          <PanelRow>
            <PanelLabel>{t('label.finalised')}</PanelLabel>
            <PanelField>{localisedDate(movement.finalisedDatetime)}</PanelField>
          </PanelRow>
        )}
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => {
            setBufferedComment(e.target.value);
            update({ id: movement.id, comment: e.target.value });
          }}
          value={bufferedComment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel = ({ movement }: SidePanelProps) => {
  const t = useTranslation();
  const { success } = useNotification();
  const navigate = useNavigate();
  const { delete: deleteMovement } = useDeleteStockMovement();
  const canDelete = canDeleteStockMovement(movement.status);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(movement, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  const deleteAction = async () => {
    await deleteMovement(movement.id);
    navigate(
      RouteBuilder.create(AppRoute.Inventory)
        .addPart(AppRoute.StockMovement)
        .build()
    );
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [movement],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-stock-movement'),
      deleteSuccess: t('messages.deleted-stock-movements', { count: 1 }),
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
      <AdditionalInfoSection movement={movement} />
    </DetailPanelPortal>
  );
};
