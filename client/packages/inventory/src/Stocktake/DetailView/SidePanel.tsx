import React, { FC } from 'react';
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
  InfoTooltipIcon,
  DeleteIcon,
  useDeleteConfirmation,
  useFormatDateTime,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useStocktake } from '../api';
import { canDeleteStocktake } from '../../utils';

const AdditionalInfoSection: FC = () => {
  const t = useTranslation();

  const { comment, user, createdDatetime, update } =
    useStocktake.document.fields(['comment', 'user', 'createdDatetime']);
  const [bufferedComment, setBufferedComment] = useBufferState(comment ?? '');
  const isDisabled = useStocktake.utils.isDisabled();
  const { localisedDate } = useFormatDateTime();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username ?? '-'}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.created')}</PanelLabel>
          <PanelField>{localisedDate(createdDatetime)}</PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => {
            setBufferedComment(e.target.value);
            update({ comment: e.target.value });
          }}
          value={bufferedComment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel = () => {
  const t = useTranslation('inventory');
  const { success } = useNotification();
  const navigate = useNavigate();
  const { mutateAsync } = useStocktake.document.delete();
  const { data: stocktake } = useStocktake.document.get();
  const canDelete = stocktake ? canDeleteStocktake(stocktake) : false;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(stocktake, null, 4) ?? '')
      .then(() => success('Copied to clipboard successfully')());
  };

  const deleteAction = async () => {
    if (!stocktake) return;
    await mutateAsync([stocktake]);
    navigate(
      RouteBuilder.create(AppRoute.Inventory)
        .addPart(AppRoute.Stocktakes)
        .build()
    );
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [stocktake],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-stocktake', {
        number: stocktake?.stocktakeNumber,
      }),
      deleteSuccess: t('messages.deleted-stocktakes', {
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
      <AdditionalInfoSection />
    </DetailPanelPortal>
  );
};
