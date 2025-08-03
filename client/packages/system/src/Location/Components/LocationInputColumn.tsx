import React from 'react';
import {
  RecordWithId,
  ColumnDefinition,
  EnvUtils,
} from '@openmsupply-client/common';
import { LocationSearchInput } from './LocationSearchInput';
import { LocationRowFragment } from '../api';
interface LocationObject extends RecordWithId {
  location: LocationRowFragment;
}

const hasRequiredFields = (
  variableToCheck: unknown
): variableToCheck is LocationObject =>
  'location' in (variableToCheck as LocationObject);

export interface LocationInputColumnOptions {
  setInvalidLocationRowIds?: React.Dispatch<React.SetStateAction<string[]>>;
  restrictedToLocationTypeId?: string | null;
}
export const getLocationInputColumn = <T extends RecordWithId>(
  options: LocationInputColumnOptions = {}
): ColumnDefinition<T> => {
  const { setInvalidLocationRowIds, restrictedToLocationTypeId } = options;
  return {
    key: 'locationInput',
    label: 'label.location',
    sortable: false,
    width: 600,
    accessor: ({ rowData }) => {
      if (hasRequiredFields(rowData)) {
        return rowData.location;
      } else {
        if (!EnvUtils.isProduction()) {
          // TODO: Bugsnag during prod
          throw new Error(`
        The default accessor for the location input column has been called with row data
        that does not have a 'location' field.

        This column requires the field 'location' to be present in the row data to render
        correctly.

        Have you forgotten to provide a custom accessor to return the location object? i.e.
        [ getLocationInputColumn(), { accessor: ({rowData}) => ({ location: rowData.item.location }) }]
        `);
        } else {
          return null;
        }
      }
    },
    Cell: ({ rowData, column, columnIndex, rowIndex, isDisabled }) => {
      const value = column.accessor({ rowData }) as LocationRowFragment | null;

      const onChange = (location: LocationRowFragment | null) => {
        column.setter({ ...rowData, location });
      };

      const autoFocus = columnIndex === 0 && rowIndex === 0;

      // Updates the invalid location row id array for row errors
      const handleInvalidLocationChange = (invalid: boolean) => {
        if (setInvalidLocationRowIds) {
          setInvalidLocationRowIds(prev => {
            const prevSet = new Set(prev);
            if (invalid) {
              if (prevSet.has(rowData.id)) return prev;
              return [...prev, rowData.id];
            } else {
              if (!prevSet.has(rowData.id)) return prev;
              return prev.filter(id => id !== rowData.id);
            }
          });
        }
      };

      return (
        <LocationSearchInput
          autoFocus={autoFocus}
          disabled={!!isDisabled}
          selectedLocation={value}
          width={column.width}
          onChange={onChange}
          restrictedToLocationTypeId={restrictedToLocationTypeId}
          onInvalidLocation={
            setInvalidLocationRowIds
              ? invalid => handleInvalidLocationChange(invalid)
              : undefined
          }
        />
      );
    },
  };
};
