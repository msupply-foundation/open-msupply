import React from 'react';
import { PropertyV2DetailRows } from '@openmsupply-client/common';
import { useName } from '../api';

interface NamePropertiesV2Props {
  /**
   * The `name.propertiesV2` blob from the Name node, keyed by property `key`.
   * Already server-filtered to defined + visible keys (Stage 4), so we trust
   * its keys. JSON scalar arrives as a parsed object (no JSON.parse needed).
   */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only display of a name's `propertiesV2`. Rendering is delegated to the
 * shared {@link PropertyV2DetailRows} (consistent with item/patient): all
 * configured `name`-table definitions show as labelled rows — including ones
 * the name hasn't set, which render blank. No edit controls — editing is a
 * later stage.
 */
export const NamePropertiesV2 = ({ properties }: NamePropertiesV2Props) => {
  const { data: definitions } = useName.document.propertiesV2();

  if (!definitions?.length) return null;

  return (
    <PropertyV2DetailRows definitions={definitions} properties={properties} />
  );
};
