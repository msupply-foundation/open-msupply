import React from 'react';
import { DetailInputWithLabelRow } from './InputWithLabelRow';
import { PropertyV2Input } from '@common/components';
import { PropertyV2DefinitionLike } from '@common/utils';

/**
 * Structural shape needed to render a labelled propertiesV2 row. The generated
 * per-record `PropertyV2Fragment` types (item, name, …) are all assignable to
 * this, so this component is shared rather than duplicated per record kind.
 */
export interface PropertyV2RenderDefinition extends PropertyV2DefinitionLike {
  id: string;
  key: string;
  name: string;
}

interface PropertyV2DetailRowsProps {
  /** All property definitions for the record kind, in display order. */
  definitions: PropertyV2RenderDefinition[];
  /** The record's `propertiesV2` value blob, keyed by property `key`. */
  properties?: Record<string, unknown> | null;
  labelWidthPercentage?: number;
}

/**
 * Read-only display of a record's `propertiesV2`: one labelled row per
 * definition — including definitions the record hasn't set, which render blank
 * — so the full set of configured properties is always visible. The label is
 * the definition `name` (falling back to `key`); the control is the shared
 * {@link PropertyV2Input} in its read-only mode (BOOLEAN → disabled checkbox,
 * everything else → disabled text / resolved OPTION name).
 */
export const PropertyV2DetailRows = ({
  definitions,
  properties,
  labelWidthPercentage,
}: PropertyV2DetailRowsProps) => (
  <>
    {definitions.map(definition => (
      <DetailInputWithLabelRow
        key={definition.id}
        label={definition.name || definition.key}
        labelWidthPercentage={labelWidthPercentage}
        Input={
          <PropertyV2Input
            definition={definition}
            value={properties?.[definition.key]}
          />
        }
      />
    ))}
  </>
);
