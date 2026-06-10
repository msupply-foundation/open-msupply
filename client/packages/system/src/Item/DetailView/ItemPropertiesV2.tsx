import React from 'react';
import {
  DetailSection,
  PropertyV2DetailRows,
  useTranslation,
} from '@openmsupply-client/common';
import { useItemPropertiesV2 } from '../api';

interface ItemPropertiesV2Props {
  /**
   * The `item.propertiesV2` blob from the Item node, keyed by property `key`.
   * Already server-filtered to defined + visible keys, so we trust its keys.
   * JSON scalar arrives as a parsed object (no JSON.parse needed).
   */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only display of an item's `propertiesV2` (legacy mSupply
 * `[item]user_field_1..7`) under a "Custom fields" section. Rendering is
 * delegated to the shared {@link PropertyV2DetailRows}, so all configured
 * definitions show (unset ones blank) and the value-type → control mapping is
 * shared with name/patient. Items are central-only and never edited in OMS.
 */
export const ItemPropertiesV2 = ({ properties }: ItemPropertiesV2Props) => {
  const t = useTranslation();
  const { data: definitions } = useItemPropertiesV2();

  if (!definitions?.length) return null;

  return (
    <DetailSection title={t('title.custom-fields')}>
      <PropertyV2DetailRows definitions={definitions} properties={properties} />
    </DetailSection>
  );
};
