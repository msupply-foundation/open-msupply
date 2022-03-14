import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  useTranslation,
} from '@openmsupply-client/common';

const RelatedDocumentsSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid container gap={0.5} key="additional-info"></Grid>
    </DetailPanelSection>
  );
};

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
