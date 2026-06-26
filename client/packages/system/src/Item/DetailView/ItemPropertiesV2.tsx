import React from 'react';
import { PropertyV2DetailRows } from '@openmsupply-client/common';
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
 * `[item]user_field_1..7`). Rendering is delegated to the shared
 * {@link PropertyV2DetailRows} (consistent with name/patient): all configured
 * definitions show (unset ones blank). The enclosing "Properties" tab already
 * labels the section, so no extra header. Items are central-only and never
 * edited in OMS.
 */
export const ItemPropertiesV2 = ({ properties }: ItemPropertiesV2Props) => {
  const { data: definitions } = useItemPropertiesV2();

  if (!definitions?.length) return null;

  return (
    <PropertyV2DetailRows definitions={definitions} properties={properties} />
  );
};
