import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { useStocktake } from '../api';
import { canDeleteStocktake } from '../../utils';

const AdditionalInfoSection: FC = () => {
  const t = useTranslation();

  const { comment, user, update } = useStocktake.document.fields([
    'comment',
    'user',
  ]);
  const [bufferedComment, setBufferedComment] = useBufferState(comment ?? '');
  const isDisabled = useStocktake.utils.isDisabled();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user.email} /> : null}
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
  const { success } = useNotification();
  const t = useTranslation('inventory');
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
