import React, { FC } from 'react';
import {
  Box,
  ButtonWithIcon,
  PrinterIcon,
  DetailFormSkeleton,
} from '@openmsupply-client/common';
import { SimpleLabelDisplay } from '../../Components/SimpleLabelDisplay';
import { Status } from 'packages/coldchain/src/Equipment/Components';

import { AccordionPanelSection } from 'packages/invoices/src/Prescriptions/LineEditView/PanelSection';
import { useEquipmentDetailView } from 'packages/coldchain/src/Equipment/DetailView';
import { Summary, Details } from 'packages/coldchain/src/Equipment/DetailView/Tabs';
import { Footer } from './Footer';

export const EquipmentDetailView: FC = () => {
  const {
    isLoading,
    isLoadingLocations,
    onChange,
    draft,
    locations,
    data,
    isDirty,
    isSaving,
    showSaveConfirmation,
    // navigate,
    t,
  } = useEquipmentDetailView();

  if (isLoading && isLoadingLocations) return <DetailFormSkeleton />;

  if (!data) return <h1>{t('error.asset-not-found')}</h1>;

  return (
    <Box
      sx={{
        width: '100%',
        flex: 1,
        padding: '.5em',
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: '50px',
          display: 'flex',
          padding: '.75rem',
        }}
      >
        <ButtonWithIcon
          shouldShrink={false}
          label={'Print QR code'}
          onClick={() => { }}
          Icon={<PrinterIcon />}
        />
      </Box>

      <Box
        sx={{
          padding: '.25rem .75rem',
        }}
      >
        <SimpleLabelDisplay
          label="Manufacturer"
          value={data.catalogueItem?.manufacturer || 'n/a'}
        />
        <SimpleLabelDisplay
          label="Type"
          value={data.assetType?.name || 'n/a'}
        />
      </Box>

      <Box sx={{ padding: '.2rem', marginBottom: '.5em' }}>
        <Status status={data.statusLog?.status} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <AccordionPanelSection title="Summary" defaultExpanded={false}>
          <Summary onChange={onChange} draft={draft} locations={locations} />
          <Footer
            isDirty={isDirty}
            isSaving={isSaving}
            showSaveConfirmation={showSaveConfirmation}
          />
        </AccordionPanelSection>

        <AccordionPanelSection title="Details" defaultExpanded={false}>
          <Details onChange={onChange} draft={draft} />
          <Footer
            isDirty={isDirty}
            isSaving={isSaving}
            showSaveConfirmation={showSaveConfirmation}
          />
        </AccordionPanelSection>
      </Box>
    </Box>
  );
};
