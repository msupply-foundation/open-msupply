import React, { useState } from 'react';
import {
  Alert,
  AncillaryStateNode,
  FlatButton,
  useTranslation,
  Box,
  PaperPopover,
  Typography,
} from '@openmsupply-client/common';
import { RequestFragment } from '@openmsupply-client/system';
import { useRequest } from '../../api';

type AncillaryDelta = NonNullable<
  RequestFragment['ancillaryState']
>['toAdd'][number];

/**
 * Toolbar banner that surfaces missing or stale ancillary item lines on a
 * request requisition. `NeedsAdd` takes priority; once added, any remaining
 * stale quantities surface as `NeedsUpdate`. The Details button shows the
 * full execution plan — every item the Add/Update button will touch.
 */
export const AncillaryItemsBanner = () => {
  const t = useTranslation();
  const { data } = useRequest.document.get();
  const { add, update, isPending } = useRequest.line.refreshAncillaryItems();
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);

  const ancillaryState = data?.ancillaryState;
  if (!ancillaryState || ancillaryState.state === AncillaryStateNode.None) {
    return null;
  }

  const isAdd = ancillaryState.state === AncillaryStateNode.NeedsAdd;
  const message = isAdd
    ? t('messages.ancillary-items-available', { count: ancillaryState.count })
    : t('messages.ancillary-items-need-update', {
        count: ancillaryState.count,
      });

  const { toAdd, toUpdate } = ancillaryState;
  const hasPlan = toAdd.length > 0 || toUpdate.length > 0;

  return (
    <Alert
      severity="info"
      sx={{ maxWidth: 1000, alignItems: 'center' }}
      action={
        <Box display="flex" alignItems="center">
          {hasPlan && (
            <PaperPopover
              mode="click"
              width={600}
              placement={{ vertical: 'bottom', horizontal: 'center' }}
              anchorEl={detailsAnchor}
              onAnchorElChange={setDetailsAnchor}
              Content={
                <Box display="flex" flexDirection="column" gap={2} p={3}>
                  {toAdd.length > 0 && (
                    <PlanSection
                      label={t('label.ancillary-plan-to-add')}
                      deltas={toAdd}
                      showCurrent={false}
                    />
                  )}
                  {toUpdate.length > 0 && (
                    <PlanSection
                      label={t('label.ancillary-plan-to-update')}
                      deltas={toUpdate}
                      showCurrent
                    />
                  )}
                </Box>
              }
            >
              <FlatButton
                label={t('button.details')}
                onClick={() => {}}
                color="primary"
              />
            </PaperPopover>
          )}
          <FlatButton
            label={isAdd ? t('button.add') : t('button.update')}
            onClick={() => (isAdd ? add() : update())}
            disabled={isPending}
            color="primary"
          />
        </Box>
      }
    >
      {message}
    </Alert>
  );
};

const PlanSection = ({
  label,
  deltas,
  showCurrent,
}: {
  label: string;
  deltas: AncillaryDelta[];
  showCurrent: boolean;
}) => {
  const t = useTranslation();
  const columns = showCurrent ? 'auto 1fr auto auto' : 'auto 1fr auto';
  return (
    <Box
      display="grid"
      gridTemplateColumns={columns}
      columnGap={2}
      rowGap={0.5}
      alignItems="baseline"
    >
      <Typography fontWeight={700} sx={{ gridColumn: 'span 2' }}>
        {label}
      </Typography>
      {showCurrent && (
        <Typography variant="caption" textAlign="right">
          {t('label.current')}
        </Typography>
      )}
      <Typography variant="caption" textAlign="right">
        {showCurrent ? t('label.new') : ''}
      </Typography>
      {deltas.map(d => {
        const unit = d.item.unitName ?? t('label.unit').toLowerCase();
        return (
          <React.Fragment key={d.itemId}>
            <Typography
              variant="body2"
              color="text.secondary"
              whiteSpace="nowrap"
            >
              {d.item.code}
            </Typography>
            <Typography variant="body2">{d.item.name}</Typography>
            {showCurrent && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="right"
                whiteSpace="nowrap"
              >
                {d.currentQuantity != null
                  ? `${d.currentQuantity} ${unit}`
                  : '-'}
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={600}
              textAlign="right"
              whiteSpace="nowrap"
            >
              {`${d.requiredQuantity} ${unit}`}
            </Typography>
          </React.Fragment>
        );
      })}
    </Box>
  );
};
