import React, { FC } from 'react';
import {
  BufferedTextArea,
  ColorSelectButton,
  DetailPanelSection,
  FieldUpdateMutation,
  Grid,
  InfoTooltipIcon,
  Link,
  PanelField,
  PanelLabel,
  PanelRow,
  RouteBuilder,
  Tooltip,
  UNDEFINED_STRING_VALUE,
  useBufferState,
  useCurrency,
  useFormatDateTime,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { RequestFragment } from '../RequestRequisition/api';
import { ResponseFragment } from '../ResponseRequisition/api';

interface ProgramInfoSectionProps {
  orderType?: string | null;
  programName?: string | null;
  period?: {
    name: string;
  } | null;
}

export const ProgramInfoSection: FC<ProgramInfoSectionProps> = ({
  orderType,
  programName,
  period,
}) => {
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

interface AdditionalInfoSectionProps {
  colour?: string | null;
  comment?: string | null;
  createdDatetime: string;
  user?: {
    username?: string | null;
    email?: string | null;
  } | null;
  update:
    | FieldUpdateMutation<RequestFragment>
    | FieldUpdateMutation<ResponseFragment>;
  isDisabled: boolean;
}

export const AdditionalInfoSection: FC<AdditionalInfoSectionProps> = ({
  colour,
  comment,
  createdDatetime,
  user,
  update,
  isDisabled,
}) => {
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

interface RelatedDocumentsSectionProps {
  shipments: {
    totalCount: number;
    nodes: Array<{
      id: string;
      invoiceNumber?: number | null;
      createdDatetime: string;
      user?: {
        username?: string | null;
      } | null;
    }>;
  };
  createdFromRequisition?: {
    id: string;
    requisitionNumber?: number | null;
    createdDatetime: string;
    user?: {
      username?: string | null;
    } | null;
  } | null;
  inbound?: boolean;
}

export const RelatedDocumentsSection: FC<RelatedDocumentsSectionProps> = ({
  shipments,
  createdFromRequisition,
  inbound = false,
}) => {
  const t = useTranslation();
  const { localisedDate: d } = useFormatDateTime();
  const { canCreateInternalOrderFromARequisition = false } = usePreferences();

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t(
      inbound
        ? 'messages.inbound-shipment-created-on'
        : 'messages.outbound-shipment-created-on',
      {
        date: d(createdDatetime),
      }
    );

    return (tooltip += ` ${t('messages.by-user', { username })}`);
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid direction="column" gap={0.5}>
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
                to={
                  inbound
                    ? RouteBuilder.create(AppRoute.Replenishment)
                        .addPart(AppRoute.InboundShipment)
                        .addPart(shipment.id)
                        .build()
                    : RouteBuilder.create(AppRoute.Distribution)
                        .addPart(AppRoute.OutboundShipment)
                        .addPart(shipment?.id)
                        .build()
                }
              />
            </Grid>
          </Tooltip>
        ))}
        {canCreateInternalOrderFromARequisition && createdFromRequisition && (
          <Tooltip
            key={createdFromRequisition?.id}
            title={getTooltip(
              createdFromRequisition?.createdDatetime,
              createdFromRequisition?.user?.username ?? UNDEFINED_STRING_VALUE
            )}
          >
            <Grid>
              <RelatedDocumentsRow
                key={createdFromRequisition?.id}
                label={t('label.created-from-requisition')}
                value={createdFromRequisition?.requisitionNumber}
                to={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(createdFromRequisition?.id ?? '')
                  .build()}
              />
            </Grid>
          </Tooltip>
        )}
      </Grid>
    </DetailPanelSection>
  );
};

interface PricingLines {
  nodes: Array<{
    pricePerUnit?: number | null;
    requestedQuantity: number;
    supplyQuantity?: number | null;
  }>;
}

export const PricingSectionComponent: React.FC<{
  lines: PricingLines;
  isResponseReq: boolean;
}> = ({ lines, isResponseReq }) => {
  const t = useTranslation();
  const { c } = useCurrency();
  const { showIndicativePriceInRequisitions } = usePreferences();

  if (!showIndicativePriceInRequisitions) return null;

  const totalPrice = lines.nodes
    .map(
      line =>
        (line.pricePerUnit ?? 0) *
        (isResponseReq ? (line.supplyQuantity ?? 0) : line.requestedQuantity)
    )
    .reduce((a, b) => a + b, 0);

  return (
    <DetailPanelSection title={t('heading.pricing')}>
      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('heading.grand-total')}</PanelLabel>
        <PanelField>{c(totalPrice).format()}</PanelField>
      </PanelRow>
    </DetailPanelSection>
  );
};
