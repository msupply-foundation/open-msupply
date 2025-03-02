import React, { useState } from 'react';
import { StockOutAlert, StockOutAlerts } from '../../StockOut';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { useTranslation } from '@common/intl';
import { summarisePrescribedStock } from './helpers';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';

interface StockAllocationSectionProps {
  itemId: string;
  disabled: boolean;
  isNew: boolean;
  prescriptionLines: DraftPrescriptionLine[];
  itemDetails: DraftItem | null;
}

export const StockAllocationSection = ({
  itemId,
  disabled,
  isNew,
  prescriptionLines,
  itemDetails,
}: StockAllocationSectionProps) => {
  const t = useTranslation();
  // const {data} = lines by item
  // state seems odd but lets roll w it
  const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);

  const updateQuantity = () => {};

  return (
    <>
      {!disabled && (
        <StockOutAlerts
          allocationAlerts={allocationAlerts}
          isAutoAllocated={isAutoAllocated}
          showZeroQuantityConfirmation={false}
        />
      )}
      <AccordionPanelSection
        title={t('label.quantity')}
        closedSummary={summarisePrescribedStock(prescriptionLines, t)}
        defaultExpanded={isNew && !disabled}
        key={itemId + '_quantity'}
      >
        <PrescriptionLineEditTable
          item={itemDetails}
          onChange={updateQuantity}
          rows={prescriptionLines}
          isDisabled={disabled}
        />
      </AccordionPanelSection>
    </>
  );
};
