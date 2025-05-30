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
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OrderInfoSection } from './OrderInfoSection';

const ProgramInfoSection: FC = () => {
  const { orderType, programName, period } = useRequest.document.fields([
    'orderType',
    'programName',
    'period',
  ]);
  const t = useTranslation();

  return programName ? (
    <DetailPanelSection title={t('heading.program-info')}>
      <Grid container gap={0.5} key="program-info">
        <PanelRow>
          <PanelLabel>{t('label.order-type')}</PanelLabel>
          <PanelField>{orderType ?? ''}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.program')}</PanelLabel>
          <PanelField>{programName ?? ''}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.period')}</PanelLabel>
          <PanelField>{period?.name ?? ''}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  ) : (
    <></>
  );
};

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
          <PanelField>{user?.username ?? UNDEFINED_STRING_VALUE}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.created')}</PanelLabel>
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
  const t = useTranslation();
  const { localisedDate: d } = useFormatDateTime();
  const { shipments } = useRequest.document.fields('shipments');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.inbound-shipment-created-on', {
      date: d(new Date(createdDatetime)),
    });

    return (tooltip += ` ${t('messages.by-user', { username })}`);
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid flexDirection="column" gap={0.5}>
        {!shipments?.totalCount && (
          <PanelLabel>{t('messages.no-shipments-yet')}</PanelLabel>
        )}
        {shipments?.nodes.map(shipment => (
          <Tooltip
            key={shipment.id}
            title={getTooltip(
              shipment.createdDatetime,
              shipment.user?.username ?? UNDEFINED_STRING_VALUE
            )}
          >
            <Grid>
              <RelatedDocumentsRow
                key={shipment.id}
                label={t('label.shipment')}
                value={shipment.invoiceNumber}
                to={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(shipment.id)
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
  const t = useTranslation();
  const navigate = useNavigate();
  const { success } = useNotification();
  const { mutateAsync } = useRequest.document.delete();
  const { data } = useRequest.document.get();
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
      <ProgramInfoSection />
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
