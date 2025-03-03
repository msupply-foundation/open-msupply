import React, { useState } from 'react';
import { StockOutAlert, StockOutAlerts } from '../../StockOut';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { DateUtils, useFormatNumber, useTranslation } from '@common/intl';
import {
  getPrescriptionAllocationAlerts,
  summarisePrescribedStock,
} from './helpers';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';
import { IssueQuantities } from './IssueQuantities';

interface StockAllocationSectionProps {
  disabled: boolean;
  isNew: boolean;
  prescriptionLines: DraftPrescriptionLine[];
  itemDetails: DraftItem | null;
  updateLineQuantity: (lineId: string, quantity: number) => void;
  allocateQuantity: (
    quantity: number,
    prescribedQuantity: number | null
  ) => DraftPrescriptionLine[] | undefined;
}

export const StockAllocationSection = ({
  disabled,
  isNew,
  prescriptionLines,
  itemDetails,
  updateLineQuantity,
  allocateQuantity,
}: StockAllocationSectionProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const [isAutoAllocated, setIsAutoAllocated] = useState(false);
  const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);

  const updateQuantity = (lineId: string, quantity: number) => {
    updateLineQuantity(lineId, quantity);
    setIsAutoAllocated(false);
  };

  const onAllocate = (quantity: number, prescribedQuantity: number | null) => {
    const allocatedLines = allocateQuantity(quantity, prescribedQuantity);

    const allocatedQuantity =
      allocatedLines?.reduce(
        (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
        0
      ) ?? 0;

    const someLinesExpired = prescriptionLines.some(
      ({ stockLine }) =>
        (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
        !!stockLine?.expiryDate &&
        DateUtils.isExpired(new Date(stockLine?.expiryDate))
    );

    const alerts = getPrescriptionAllocationAlerts(
      allocatedLines,
      allocatedQuantity,
      quantity,
      0, // placeholderLine?.numberOfPacks ?? 0,
      false, // on holds are filtered out...
      someLinesExpired,
      format,
      t
    );

    setAllocationAlerts(alerts);
    setIsAutoAllocated(true);

    return allocatedQuantity;
  };

  return (
    <>
      {!disabled && (
        <StockOutAlerts
          allocationAlerts={allocationAlerts}
          isAutoAllocated={isAutoAllocated}
          showZeroQuantityConfirmation={false} // not used here
        />
      )}
      <AccordionPanelSection
        title={t('label.quantity')}
        closedSummary={summarisePrescribedStock(prescriptionLines, t)}
        defaultExpanded={isNew && !disabled}
      >
        <IssueQuantities
          disabled={disabled}
          unitName={itemDetails?.unitName ?? undefined}
          onAllocate={onAllocate}
        />
        <PrescriptionLineEditTable
          item={itemDetails}
          updateLineQuantity={updateQuantity}
          rows={prescriptionLines}
          isDisabled={disabled}
        />
      </AccordionPanelSection>
    </>
  );
};
