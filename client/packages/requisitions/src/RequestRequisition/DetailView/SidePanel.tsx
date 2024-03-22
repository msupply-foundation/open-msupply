import React, { FC } from 'react';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useBufferState,
  Tooltip,
  Link,
  useFormatDateTime,
  RouteBuilder,
  InfoTooltipIcon,
  DeleteIcon,
  RequisitionNodeStatus,
  useDeleteConfirmation,
  useNavigate,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { AppRoute } from '@openmsupply-client/config';

const AdditionalInfoSection: FC = () => {
  const isDisabled = useRequest.utils.isDisabled();
  const { user, colour, comment, createdDatetime, update } =
    useRequest.document.fields([
      'colour',
      'createdDatetime',
      'comment',
      'user',
    ]);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.entered')}</PanelLabel>
          <PanelField>{localisedDate(createdDatetime)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={color => {
                setBufferedColor(color.hex);
                update({ colour: color.hex });
              }}
              color={bufferedColor ?? ''}
            />
          </PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment ?? ''}
        />
      </Grid>
    </DetailPanelSection>
  );
};

const RelatedDocumentsRow: FC<{
  label: string;
  to: string;
  value?: number | null;
}> = ({ label, to, value }) => (
  <PanelRow>
    <PanelLabel>{label}</PanelLabel>
    <PanelField>
      <Link to={to}>{`#${value}`}</Link>
    </PanelField>
  </PanelRow>
);

const RelatedDocumentsSection: FC = () => {
  const t = useTranslation('replenishment');
  const { localisedDate: d } = useFormatDateTime();
  const { shipments } = useRequest.document.fields('shipments');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.inbound-shipment-created-on', {
      date: d(new Date(createdDatetime)),
    });

    if (username && username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', { username })}`;
    }

    return tooltip;
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" gap={0.5}>
        {!shipments?.totalCount && (
          <PanelLabel>{t('messages.no-shipments-yet')}</PanelLabel>
        )}
        {shipments?.nodes.map(shipment => (
          <Tooltip
            key={shipment.id}
            title={getTooltip(
              shipment.createdDatetime,
              shipment.user?.username
            )}
          >
            <Grid item>
              <RelatedDocumentsRow
                key={shipment.id}
                label={t('label.shipment')}
                value={shipment.invoiceNumber}
                to={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(String(shipment.invoiceNumber))
                  .build()}
              />
            </Grid>
          </Tooltip>
        ))}
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const t = useTranslation('replenishment');
  const navigate = useNavigate();
  const { success } = useNotification();
  const { mutateAsync } = useRequest.document.delete();
  const { data } = useRequest.document.get();
  const canDelete = data?.status === RequisitionNodeStatus.Draft;

  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync([data]).then(() => {
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InternalOrder)
          .build()
      );
    })
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success('Copied to clipboard successfully')());
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-requisition', {
        number: data?.requisitionNumber,
      }),
      deleteSuccess: t('messages.deleted-requisitions', {
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
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
