import React, { FC } from 'react';
import {
  Box,
  DetailFormSkeleton,
  StatusChip,
} from '@openmsupply-client/common';
import { SimpleLabelDisplay } from '../../Components/SimpleLabelDisplay';
import { AccordionPanelSection } from 'packages/invoices/src/Prescriptions/LineEditView/PanelSection';
import { useEquipmentDetailView } from 'packages/coldchain/src/Equipment/DetailView';
import {
  Summary,
  Details,
} from 'packages/coldchain/src/Equipment/DetailView/Tabs';
import { Footer } from './Footer';
import { StatusLogs } from 'packages/coldchain/src/Equipment/DetailView/Tabs/StatusLogs';
import { UpdateStatusButton } from 'packages/coldchain/src/Equipment/DetailView/UpdateStatusButton';
import { Documents } from 'packages/coldchain/src/Equipment/DetailView/Tabs/Documents';
import { LogCardListView } from './LogCardListView';
import { statusColourMap } from 'packages/coldchain/src/Equipment/utils';

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

  const status = data.statusLog?.status
    ? statusColourMap(data.statusLog?.status)
    : undefined;

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
          gap: '.5em',
        }}
      >
        <UpdateStatusButton assetId={data?.id} />
      </Box>
      <Box
        sx={{
          padding: '.25rem .75rem',
        }}
      >
        <SimpleLabelDisplay
          label={t('label.manufacturer')}
          value={data.catalogueItem?.manufacturer || 'n/a'}
        />
        <SimpleLabelDisplay
          label={t('label.type')}
          value={data.assetType?.name || 'n/a'}
        />
      </Box>

      <Box sx={{ padding: '.2rem', marginBottom: '.5em' }}>
        <StatusChip label={status?.label} colour={status?.colour} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <AccordionPanelSection
          title={t('label.statushistory')}
          defaultExpanded={false}
        >
          {draft === undefined ? null : <StatusLogs assetId={draft.id} />}
        </AccordionPanelSection>

        <AccordionPanelSection
          title={t('label.summary')}
          defaultExpanded={false}
        >
          <Summary onChange={onChange} draft={draft} locations={locations} />
        </AccordionPanelSection>

        <AccordionPanelSection
          title={t('label.details')}
          defaultExpanded={false}
        >
          <Details onChange={onChange} draft={draft} />
        </AccordionPanelSection>

        <AccordionPanelSection
          title={t('label.documents')}
          defaultExpanded={false}
        >
          {draft === undefined ? null : <Documents draft={draft} />}
        </AccordionPanelSection>

        <AccordionPanelSection title={t('label.log')} defaultExpanded={false}>
          <LogCardListView recordId={data?.id} />
        </AccordionPanelSection>
        {isDirty && (
          <Footer
            isDirty={isDirty}
            isSaving={isSaving}
            showSaveConfirmation={showSaveConfirmation}
          />
        )}
      </Box>
    </Box>
  );
};
