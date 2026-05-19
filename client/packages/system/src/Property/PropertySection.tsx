import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailInputWithLabelRow,
  DetailSection,
  FnUtils,
  LocaleKey,
  PropertyParentTableEnum,
  PropertyValueGqlInput,
  Typography,
  TypedTFunction,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  PropertyDetailFragment,
  PropertyValueFragment,
  useDeletePropertyValue,
  usePropertiesForTable,
  useUpsertPropertyValue,
} from './api';
import { PropertyValueField } from './PropertyValueField';

interface PropertySectionProps {
  table: PropertyParentTableEnum;
  recordId: string | undefined;
  // Property values for the record. Caller fetches via the parent node's
  // `propertyValues` resolver (which uses a DataLoader) and passes them in,
  // so we don't fire a duplicate per-record value query.
  values: PropertyValueFragment[] | undefined;
  disabled?: boolean;
}

const labelFor = (
  property: PropertyDetailFragment,
  t: TypedTFunction<LocaleKey>
) => {
  if (property.translationKey) {
    const translated = t(property.translationKey as LocaleKey);
    if (translated && translated !== property.translationKey) return translated;
  }
  return property.name;
};

export const PropertySection = ({
  table,
  recordId,
  values,
  disabled,
}: PropertySectionProps) => {
  const t = useTranslation();
  const { error: notifyError } = useNotification();

  const { data: properties, isLoading } = usePropertiesForTable(table);
  const { mutateAsync: upsert } = useUpsertPropertyValue(table, recordId);
  const { mutateAsync: deleteValue } = useDeletePropertyValue(table, recordId);

  if (isLoading) return <BasicSpinner />;
  if (!properties || properties.length === 0) return null;

  const valuesByProperty = new Map<string, PropertyValueFragment>(
    (values ?? []).map((v: PropertyValueFragment) => [v.property.id, v])
  );

  const onChange = async (
    property: PropertyDetailFragment,
    input: PropertyValueGqlInput
  ) => {
    if (!recordId) return;
    try {
      const existing = valuesByProperty.get(property.id);
      await upsert({
        id: existing?.id ?? FnUtils.generateUUID(),
        table,
        recordId,
        propertyId: property.id,
        value: input,
      });
    } catch (e) {
      notifyError(t('error.saving-property-value'))();
    }
  };

  const onClear = async (property: PropertyDetailFragment) => {
    if (!recordId) return;
    try {
      await deleteValue({ table, recordId, propertyId: property.id });
    } catch (e) {
      notifyError(t('error.saving-property-value'))();
    }
  };

  return (
    <DetailSection title={t('heading.properties')}>
      <Box display="flex" flexDirection="column" gap={1.5} width="100%">
        {properties.map((property: PropertyDetailFragment) => (
          <DetailInputWithLabelRow
            key={property.id}
            label={labelFor(property, t)}
            inputAlignment="start"
            Input={
              <PropertyValueField
                property={property}
                value={valuesByProperty.get(property.id)}
                onChange={input => onChange(property, input)}
                onClear={() => onClear(property)}
                disabled={disabled}
              />
            }
          />
        ))}
        {properties.length === 0 && (
          <Typography color="text.secondary">
            {t('label.no-properties-for-record')}
          </Typography>
        )}
      </Box>
    </DetailSection>
  );
};
