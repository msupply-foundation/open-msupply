import React from 'react';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { useTranslation } from '@common/intl';
import {
  Grid,
  InvoiceNodeStatus,
  useBufferState,
} from '@openmsupply-client/common';
import { ItemSearchExtraFilter } from '@openmsupply-client/system';
import { ItemSelectSection } from './ItemSelectSection';
import { InvoiceItemFragment } from '../api';
import { PrescriptionItemDetails } from './PrescriptionItemDetails';

interface PrescriptionLineEditProps {
  prescriptionId: string;
  itemId: string;
  currentItem?: InvoiceItemFragment;
  disabled: boolean;
  status: InvoiceNodeStatus;
  programId?: string;
  newItemFilter: ItemSearchExtraFilter;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditProps> = ({
  prescriptionId,
  itemId,
  currentItem,
  programId,
  disabled,
  status,
  newItemFilter,
}) => {
  const t = useTranslation();

  const isNew = itemId === 'new';

  const [selectedItemId, setSelectedItemId] = useBufferState<string | null>(
    isNew ? null : itemId
  );

  return (
    <>
      <Grid
        container
        gap="4px"
        sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}
      >
        <AccordionPanelSection
          // Key ensures component will reload when switching item, but not when
          // making other changes within item (e.g. quantity)
          key={itemId + '_item_search'}
          title={t('label.item', { count: 1 })}
          closedSummary={currentItem?.name}
          defaultExpanded={isNew}
        >
          <Grid flex={1}>
            <ItemSelectSection
              selectedItemId={selectedItemId}
              setSelectedItemId={setSelectedItemId}
              isNew={isNew}
              disabled={disabled}
              newItemFilter={newItemFilter}
              programId={programId}
            />
          </Grid>
        </AccordionPanelSection>
        {selectedItemId && (
          <PrescriptionItemDetails
            itemId={selectedItemId}
            isNew={isNew}
            prescriptionId={prescriptionId}
            status={status}
            disabled={disabled}
          />
        )}
      </Grid>
    </>
  );
};
