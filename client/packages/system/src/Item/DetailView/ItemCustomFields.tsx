import React from 'react';
import { CustomFieldDetailRows } from '@openmsupply-client/common';
import { useItemCustomFields } from '../api';

interface ItemCustomFieldsProps {
  /**
   * The `item.customFields` blob from the Item node, keyed by property `key`.
   * Already server-filtered to defined + visible keys, so we trust its keys.
   * JSON scalar arrives as a parsed object (no JSON.parse needed).
   */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only display of an item's `customFields` (legacy mSupply
 * `[item]user_field_1..7`). Rendering is delegated to the shared
 * {@link CustomFieldDetailRows} (consistent with name/patient): all configured
 * definitions show (unset ones blank). The enclosing "Properties" tab already
 * labels the section, so no extra header. Items are central-only and never
 * edited in OMS.
 */
export const ItemCustomFields = ({ properties }: ItemCustomFieldsProps) => {
  const { data: definitions } = useItemCustomFields();

  if (!definitions?.length) return null;

  return (
    <CustomFieldDetailRows definitions={definitions} properties={properties} />
  );
};
