import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  FnUtils,
  InlineSpinner,
  InvoiceNodeStatus,
  Link,
  RouteBuilder,
  Typography,
  extractProperty,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { DefaultFormRowSx, useZodOptionsValidation } from '../../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { usePrescription } from '@openmsupply-client/invoices/src/Prescriptions';
import { useDraftPrescriptionLines } from '@openmsupply-client/invoices/src/Prescriptions/DetailView/PrescriptionLineEdit/hooks';
import { StockLineTable } from './StockLineTable';
import { DraftStockOutLine } from 'packages/invoices/src/types';

export const prescriptionTester = rankWith(10, uiTypeIs('Prescription'));

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
  const { handleChange, label, path, uischema, config } = props;
  const { options } = useZodOptionsValidation(Options, uischema.options);

  const { formActions } = config;
  const { core } = useJsonForms();

  const prescriptionIdPath = options?.prescriptionIdPath;
  const prescriptionId = extractProperty(core?.data, prescriptionIdPath ?? '');
  const { data: prescription, isLoading } =
    usePrescription.document.getById(prescriptionId);

  const [selectedItem, setSelectedItem] =
    useState<ItemStockOnHandFragment | null>(
      formActions.getState(`${path}_item`) ?? null
    );
  const { draftStockOutLines, setDraftStockOutLines } =
    useDraftPrescriptionLines(selectedItem);

  const { mutateAsync: createPrescription } = usePrescription.document.insert();
  const { mutateAsync: updateLines } = usePrescription.line.save();

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
    const existing: DraftStockOutLine[] = formActions.getState(
      `${path}_stockline`
    );
    if (existing && existing[0]?.item.id === selectedItem?.id)
      setDraftStockOutLines(existing);
  }, []);

  useEffect(() => {
    // We need the selected item to be reset when the category changes.
    // Unfortunately, the effect runs on all re-mounts as well, so we need to
    // capture and compare the category of the previous value to determine if
    // it's *actually* changed or just remounted
    const previous = formActions.getState(`${path}_category`);
    if (previous !== categoryName) {
      handleItemSelect(null);
    }

    formActions.setState(`${path}_category`, categoryName);
  }, [categoryName]);

  const handleItemSelect = (selectedItem: ItemStockOnHandFragment | null) => {
    setSelectedItem(selectedItem);
    if (prescriptionIdPath)
      handleChange(prescriptionIdPath, FnUtils.generateUUID());
    formActions.setState(`${path}_item`, selectedItem);
  };

  const handleStockLineUpdate = (draftLines: DraftStockOutLine[]) => {
    setDraftStockOutLines(draftLines);
    formActions.setState(`${path}_stockline`, draftLines);
    formActions.register(
      prescriptionIdPath,
      async (formActionState: Record<string, unknown>) => {
        if (!prescription && prescriptionId) {
          // Create prescription
          const prescriptionNumber = await createPrescription({
            id: prescriptionId,
            patientId: config.patientId,
          });
          // Get lines from *ALL* form components, not just this one
          const allPrescriptionLines = Object.entries(formActionState)
            .filter(([key, _]) => key.endsWith('_stockline'))
            .map(([_, value]) => value)
            .flat() as DraftStockOutLine[];
          // Mutation requires invoice (prescription) ID to be defined on each
          // line
          allPrescriptionLines.forEach(
            line => (line.invoiceId = prescriptionId)
          );
          // Add lines to prescription
          await updateLines({
            draftPrescriptionLines: allPrescriptionLines,
            patch: { id: prescriptionId, status: InvoiceNodeStatus.Picked },
          });
          success(
            t('messages.prescription-created', { count: prescriptionNumber })
          )();
        }
      },
      true // pre-submit
    );
  };

  if (!props.visible) {
    return null;
  }

  if (isLoading)
    return (
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={label}
        inputAlignment={'start'}
        Input={<InlineSpinner />}
      />
    );

  if (!prescription)
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <DetailInputWithLabelRow
          sx={DefaultFormRowSx}
          label={t('label.create-prescription')}
          inputAlignment={'start'}
          Input={null}
        />
        <Box sx={{ maxWidth: 550, marginLeft: 5 }}>
          <Typography sx={{ fontSize: '90%' }}>
            <em>{t('messages.prescription-will-be-created')}</em>
          </Typography>
          <StockItemSearchInput
            onChange={selected => handleItemSelect(selected)}
            currentItemId={selectedItem?.id}
            itemCategoryName={categoryName}
          />
          {selectedItem && (
            <StockLineTable
              stocklines={draftStockOutLines}
              handleStockLineUpdate={handleStockLineUpdate}
            />
          )}
        </Box>
      </Box>
    );

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      inputAlignment={'start'}
      Input={
        <Link
          to={RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Prescription)
            .addPart(String(prescription?.invoiceNumber))
            .build()}
          target="_blank"
        >
          {t('label.click-to-view')}
        </Link>
      }
    />
  );
};

export const Prescription = withJsonFormsControlProps(UIComponent);
