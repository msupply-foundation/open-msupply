import React from 'react';
import {
  DomainObject,
  ColumnDefinition,
  isProduction,
} from '@openmsupply-client/common';
import { Location } from '../types';
import { LocationSearchInput } from './LocationSearchInput';

interface LocationObject extends DomainObject {
  location: Location;
}

const hasRequiredFields = (
  variableToCheck: unknown
): variableToCheck is LocationObject =>
  'location' in (variableToCheck as LocationObject);

export const getLocationInputColumn = <
  T extends DomainObject
>(): ColumnDefinition<T> => ({
  key: 'locationInput',
  label: 'label.location',
  sortable: false,
  width: 600,
  accessor: ({ rowData }) => {
    if (hasRequiredFields(rowData)) {
      return rowData.location;
    } else {
      if (!isProduction()) {
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
  Cell: ({ rowData, column, rows }) => {
    const value = column.accessor({ rowData, rows }) as Location | null;

    const onChange = (location: Location | null) => {
      column.setter({ ...rowData, location });
    };

    return (
      <LocationSearchInput
        disabled={false}
        value={value}
        width={column.width}
        onChange={onChange}
      />
    );
  },
});
