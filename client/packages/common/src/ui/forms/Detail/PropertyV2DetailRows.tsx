import React from 'react';
import { Box, Typography } from '@mui/material';
import { DetailInputWithLabelRow } from './InputWithLabelRow';
import { PropertyV2Input } from '@common/components';
import { PropertyV2DefinitionLike } from '@common/utils';
import { useIsExtraSmallScreen } from '@common/hooks';

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
  /**
   * Supply to make the rows editable; called with the property `key` and its
   * new value on each change. When omitted the rows are read-only.
   */
  onChange?: (key: string, value: string | number | boolean | null) => void;
  /** Disables the inputs (only meaningful in editable mode). */
  disabled?: boolean;
}

/**
 * Display of a record's `propertiesV2`: one labelled row per definition —
 * including definitions the record hasn't set, which render blank — so the full
 * set of configured properties is always visible, in server (definition) order.
 * The label is the definition `name` (falling back to `key`); the control is the
 * shared {@link PropertyV2Input}.
 *
 * Shared by item/name/patient so the UX is identical across record kinds; the
 * only difference is editability — supply `onChange` to make the rows editable
 * (BOOLEAN/NUMBER/REAL/DATE/OPTION/TEXT), otherwise they render read-only
 * (BOOLEAN → disabled checkbox, everything else → disabled text / resolved
 * OPTION name). On extra-small screens the label stacks above the input.
 */
export const PropertyV2DetailRows = ({
  definitions,
  properties,
  labelWidthPercentage,
  onChange,
  disabled,
}: PropertyV2DetailRowsProps) => {
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    // Own the inter-row spacing here so every consumer (item/name/patient) gets
    // identical spacing regardless of the parent container's gap.
    <Box sx={{ display: 'grid', gap: 1 }}>
      {definitions.map(definition => {
        const label = definition.name || definition.key;
        const input = (
          <PropertyV2Input
            definition={definition}
            value={properties?.[definition.key] ?? null}
            disabled={disabled}
            onChange={
              onChange ? v => onChange(definition.key, v ?? null) : undefined
            }
          />
        );

        if (isExtraSmallScreen) {
          return (
            <Box key={definition.id} paddingTop={1.5}>
              <Typography
                sx={{ fontSize: '1rem!important', fontWeight: 'bold' }}
              >
                {label}
              </Typography>
              {input}
            </Box>
          );
        }

        return (
          <DetailInputWithLabelRow
            key={definition.id}
            label={label}
            labelWidthPercentage={labelWidthPercentage}
            Input={input}
          />
        );
      })}
    </Box>
  );
};
