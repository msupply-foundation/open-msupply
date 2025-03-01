import React from 'react';
import { Footer } from './Footer';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { useTranslation } from '@common/intl';
import { Grid } from '@openmsupply-client/common';
import { ItemSearchExtraFilter } from '@openmsupply-client/system';
import { ItemSelectSection } from './ItemSelectSection';
import { InvoiceItemFragment } from '../api';

interface PrescriptionLineEditProps {
  itemId: string;
  currentItem?: InvoiceItemFragment;
  disabled: boolean;
  programId?: string;
  newItemFilter: ItemSearchExtraFilter;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditProps> = ({
  itemId,
  currentItem,
  programId,
  disabled,
  newItemFilter,
}) => {
  const t = useTranslation();

  const isNew = itemId === 'new';
  return (
    <>
      <Grid
        container
        gap="4px"
        sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}
      >
        <AccordionPanelSection
          // TODO: still?
          // Key ensures component will reload when switching item, but not when
          // making other changes within item (e.g. quantity)
          key={itemId + '_item_search'}
          title={t('label.item', { count: 1 })}
          closedSummary={currentItem?.name}
          defaultExpanded={isNew}
        >
          <Grid flex={1}>
            <ItemSelectSection
              itemId={itemId}
              isNew={isNew}
              disabled={disabled}
              newItemFilter={newItemFilter}
              programId={programId}
            />
          </Grid>
        </AccordionPanelSection>
      </Grid>
      <Footer
        isSaving={false} //TODO
        disabled={true} // TODO
        handleSave={async () => {}} //TODO
      />
    </>
  );
};
