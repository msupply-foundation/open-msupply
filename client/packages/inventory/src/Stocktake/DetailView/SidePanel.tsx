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
  UNDEFINED_STRING_VALUE,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useStocktakeOld } from '../api';
import { canDeleteStocktake } from '../../utils';

const AdditionalInfoSection: FC = () => {
  const t = useTranslation();

  const { comment, user, createdDatetime, update, verifiedBy, countedBy } =
    useStocktakeOld.document.fields([
      'comment',
      'user',
      'createdDatetime',
      'countedBy',
      'verifiedBy',
    ]);
  const [bufferedComment, setBufferedComment] = useBufferState(comment ?? '');
  const [bufferedCountedBy, setBufferedCountedBy] = useBufferState(
    countedBy ?? ''
  );
  const [bufferedVerifiedBy, setBufferedVerifiedBy] = useBufferState(
    verifiedBy ?? ''
  );
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const { localisedDate } = useFormatDateTime();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username ?? UNDEFINED_STRING_VALUE}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.created')}</PanelLabel>
          <PanelField>{localisedDate(createdDatetime)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.counted-by')}</PanelLabel>
          <BufferedTextInput
            disabled={isDisabled}
            onChange={e => {
              setBufferedCountedBy(e.target.value);
              update({ countedBy: e.target.value });
            }}
            value={bufferedCountedBy}
            slotProps={{
              input: {
                style: {
                  backgroundColor: 'white',
                },
              },
            }}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.verified-by')}</PanelLabel>
          <BufferedTextInput
            disabled={isDisabled}
            onChange={e => {
              setBufferedVerifiedBy(e.target.value);
              update({ verifiedBy: e.target.value });
            }}
            value={bufferedVerifiedBy}
            slotProps={{
              input: {
                style: {
                  backgroundColor: 'white',
                },
              },
            }}
          />
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
  const t = useTranslation();
  const { success } = useNotification();
  const navigate = useNavigate();
  const { mutateAsync } = useStocktakeOld.document.delete();
  const { data: stocktake } = useStocktakeOld.document.get();
  const canDelete = stocktake ? canDeleteStocktake(stocktake) : false;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(stocktake, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
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
      // TODO differentiate betweeen duplicate stocktakeNumber on delete where stores have been merged (https://github.com/msupply-foundation/open-msupply/pull/6789)
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
