import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  FnUtils,
  // InlineSpinner,
  InvoiceNodeStatus,
  TextWithLabelRow,
  extractProperty,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { DefaultFormRowSx, useZodOptionsValidation } from '../../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  usePrescription,
  usePrescriptionLines,
} from '@openmsupply-client/invoices/src/Prescriptions';
import { StockLineTable } from './StockLineTable';
import { DraftPrescriptionLine } from '@openmsupply-client/invoices/src/types';
import { PrescriptionInfo } from './PrescriptionInfo';
import { useDraftLines } from './useDraftLines';

export const prescriptionTester = rankWith(10, uiTypeIs('Prescription'));

// TODO: update me with new prescriptions allocation!
const Options = z
  .object({
    /**
     * There should only be one prescription for the whole encounter, so where
     * it's stored in the schema won't be this component's path. This property
     * should reflect the path in the JSON schema where this value stored.
     * (must be defined in JSON schema)
     */
    prescriptionIdPath: z.string(),
    /**
     * Path on the data object to look for an item category name. If not
     * specified, will display all items, not a particular category
     */
    itemCategoryPath: z.string().optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const t = useTranslation();
  const { handleChange, path, uischema, config } = props;
  const { options } = useZodOptionsValidation(Options, uischema.options);

  const { formActions } = config;
  const { core } = useJsonForms();

  const prescriptionIdPath = options?.prescriptionIdPath;
  const prescriptionId = extractProperty(core?.data, prescriptionIdPath ?? '');
  const {
    query: {
      data: prescription,
      // loading
    },
    create: { create },
  } = usePrescription(prescriptionId);

  const {
    save: { saveLines },
  } = usePrescriptionLines(prescriptionId);

  const [selectedItem, setSelectedItem] =
    useState<ItemStockOnHandFragment | null>(
      formActions.getState(`${path}_item`) ?? null
    );

  const { draftLines, setDraftLines } = useDraftLines(selectedItem?.id ?? null);

  const { success } = useNotification();

  const itemCategoryPath = uischema.options?.['itemCategoryPath'];

  const categoryName: string | undefined = extractProperty(
    core?.data,
    itemCategoryPath ?? '',
    undefined
  );

  // Ensures that when this component is re-mounted (e.g. in a Modal), it will
  // populate the draft line data with previously acquired state
  useEffect(() => {
    const existing: DraftPrescriptionLine[] = formActions.getState(
      `${path}_stockline`
    );
    if (existing && existing[0]?.item.id === selectedItem?.id)
      setDraftLines(existing);
  }, []);

  useEffect(() => {
    // Don't change anything if prescription already exists (it just shows link
    // to existing prescription for now)
    if (prescription) return;

    // We need the selected item to be reset when the category changes.
    // Unfortunately, the effect runs on all re-mounts as well, so we need to
    // capture and compare the category of the previous value to determine if
    // it's *actually* changed or just remounted
    const previous = formActions.getState(`${path}_category`);
    if (previous && previous !== categoryName) {
      handleItemSelect(null);
    }

    formActions.setState(`${path}_category`, categoryName);
  }, [categoryName]);

  const handleItemSelect = (selectedItem: ItemStockOnHandFragment | null) => {
    setSelectedItem(selectedItem);
    formActions.setState(`${path}_item`, selectedItem, false);
    if (prescriptionIdPath)
      handleChange(prescriptionIdPath, FnUtils.generateUUID());
  };

  const handleUpdateQuantity = (stocklineId: string, numberOfPacks: number) => {
    const newDraftLines = draftLines.map(line =>
      line.id === stocklineId ? { ...line, numberOfPacks } : line
    );
    setDraftLines(newDraftLines);
    formActions.setState(`${path}_stockline`, newDraftLines);
    formActions.register(
      prescriptionIdPath,
      async (formActionState: Record<string, unknown>) => {
        if (!prescription && prescriptionId) {
          // Create prescription
          const prescription = await create({
            id: prescriptionId,
            patientId: config.patientId,
          });
          // Get lines from *ALL* form components, not just this one
          const allPrescriptionLines = Object.entries(formActionState)
            .filter(([key, _]) => key.endsWith('_stockline'))
            .map(([_, value]) => value)
            .flat() as DraftPrescriptionLine[];
          // Mutation requires invoice (prescription) ID to be defined on each
          // line
          allPrescriptionLines.forEach(
            line => (line.invoiceId = prescriptionId)
          );
          // Add lines to prescription
          await saveLines({
            draftPrescriptionLines: allPrescriptionLines,
            patch: { id: prescriptionId, status: InvoiceNodeStatus.Picked },
          });
          success(
            t('messages.prescription-created', {
              count: prescription.invoiceNumber,
            })
          )();
        }
      },
      true // pre-submit
    );
  };

  if (!props.visible) {
    return null;
  }

  // NOTE: This is temporarily disabled due to a bug in React Query in which the
  // "loading" state is not correctly updated after an error, but only in
  // production build. This *should* be fixed after upgrading React Query, so
  // please re-instate this loader once that is in place.

  // if (loading)
  //   return (
  //     <DetailInputWithLabelRow
  //       sx={DefaultFormRowSx}
  //       label={label}
  //       inputAlignment={'start'}
  //       Input={<InlineSpinner />}
  //     />
  //   );

  if (!prescription)
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <DetailInputWithLabelRow
          sx={DefaultFormRowSx}
          label={t('label.create-prescription')}
          inputAlignment={'start'}
          Input={
            <StockItemSearchInput
              onChange={selected => handleItemSelect(selected)}
              currentItemId={selectedItem?.id}
              itemCategoryName={categoryName}
            />
          }
        />
        {selectedItem && (
          <Box sx={{ marginLeft: 5 }}>
            <PrescriptionInfo prescription={prescription} />
            <TextWithLabelRow
              label={t('label.item_one')}
              text={selectedItem.name}
              textProps={{ textAlign: 'end' }}
            />

            <StockLineTable
              stocklines={draftLines}
              updateQuantity={handleUpdateQuantity}
            />
          </Box>
        )}
      </Box>
    );

  return <PrescriptionInfo prescription={prescription} />;
};

export const Prescription = withJsonFormsControlProps(UIComponent);
