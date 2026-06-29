import React from 'react';
import { CustomFieldDetailRows } from '@openmsupply-client/common';
import { useName } from '../api';

interface NameCustomFieldsProps {
  /**
   * The `name.customFields` blob from the Name node, keyed by property `key`.
   * Already server-filtered to defined + visible keys (Stage 4), so we trust
   * its keys. JSON scalar arrives as a parsed object (no JSON.parse needed).
   */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only display of a name's `customFields`. Rendering is delegated to the
 * shared {@link CustomFieldDetailRows} (consistent with item/patient): all
 * configured `name`-table definitions show as labelled rows — including ones
 * the name hasn't set, which render blank. No edit controls — editing is a
 * later stage.
 */
export const NameCustomFields = ({ properties }: NameCustomFieldsProps) => {
  const { data: definitions } = useName.document.customFields();

  if (!definitions?.length) return null;

  return (
    <CustomFieldDetailRows definitions={definitions} properties={properties} />
  );
};
