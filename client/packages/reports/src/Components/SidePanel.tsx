import React, { memo } from 'react';
import {
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelRow,
  useTranslation,
} from '@openmsupply-client/common';

export const SidePanelComponent = () => {
  const t = useTranslation('reports');

  return (
    <DetailPanelPortal>
      <DetailPanelSection title={t('heading.notification-preferences')}>
        <Grid container gap={1}>
          <PanelRow>{t('description.notification-preferences')}</PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
