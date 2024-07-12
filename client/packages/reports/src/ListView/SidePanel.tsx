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
  const isDisabled = true;

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
              disabled={isDisabled}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.threshold-for-understock')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsUnderstock}
              disabled={isDisabled}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.expiring-item-period')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsItemsExpire}
              disabled={isDisabled}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.stocktake-frequency')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.stocktakeFrequency}
              disabled={isDisabled}
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
              disabled={isDisabled}
              fullWidth
            />
          </PanelRow>
          <PanelRow>
            <NumericTextInput
              label={t('label.leads-time')}
              decimalLimit={2}
              endAdornment={t('label.months')}
              value={preferences?.monthsLeadTime}
              disabled={isDisabled}
              fullWidth
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
