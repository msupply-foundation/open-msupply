import React, { useState } from 'react';
import { StockOutAlert, StockOutAlerts } from '../../StockOut';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { useTranslation } from '@common/intl';
import { summarisePrescribedStock } from './helpers';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';

interface StockAllocationSectionProps {
  disabled: boolean;
  isNew: boolean;
  prescriptionLines: DraftPrescriptionLine[];
  itemDetails: DraftItem | null;
  updateLineQuantity: (lineId: string, quantity: number) => void;
}

export const StockAllocationSection = ({
  disabled,
  isNew,
  prescriptionLines,
  itemDetails,
  updateLineQuantity,
}: StockAllocationSectionProps) => {
  const t = useTranslation();
  // const {data} = lines by item
  // state seems odd but lets roll w it
  const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);

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
      >
        <PrescriptionLineEditTable
          item={itemDetails}
          updateLineQuantity={updateLineQuantity}
          rows={prescriptionLines}
          isDisabled={disabled}
        />
      </AccordionPanelSection>
    </>
  );
};
