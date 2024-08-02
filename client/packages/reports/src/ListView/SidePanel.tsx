import React, { memo } from 'react';
import {
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  NumericTextInput,
  PanelRow,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';

export const SidePanelComponent = () => {
  const t = useTranslation('reports');
  const { store } = useAuthContext();
  const preferences = store?.preferences;

  return (
    <DetailPanelPortal>
      <DetailPanelSection title={t('heading.notification-preferences')}>
        <Grid container gap={1}>
          <PanelRow>{t('description.notification-preferences')}</PanelRow>

          <PanelRow>
            <NumericTextInput
              label={t('label.threshold-for-overstock')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsOverstock}
              disabled={true}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.threshold-for-understock')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsUnderstock}
              disabled={true}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.expiring-item-period')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsItemsExpire}
              disabled={true}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.stocktake-frequency')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.stocktakeFrequency}
              disabled={true}
              fullWidth
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>

      <DetailPanelSection title={t('heading.custom')}>
        <Grid container gap={1}>
          <PanelRow>
            <NumericTextInput
              label={t('label.monthly-consumption-look-back-period')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthlyConsumptionLookBackPeriod}
              disabled={true}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.leads-time')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsLeadTime}
              disabled={true}
              fullWidth
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
