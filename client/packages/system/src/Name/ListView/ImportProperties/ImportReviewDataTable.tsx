import React, { FC, useState } from 'react';
import {
  ColumnDescription,
  DataTable,
  Grid,
  NamePropertyNode,
  NothingHere,
  Pagination,
  PropertyNode,
  SearchBar,
  TooltipTextCell,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { ImportRow } from './PropertiesImportModal';

interface ImportReviewDataTableProps {
  rows: ImportRow[];
  properties: NamePropertyNode[] | undefined;
}
export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  rows,
  properties,
}) => {
  const t = useTranslation();
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    first: 20,
    offset: 0,
  });
  // Could filter here for only properties that are used in import
  const propertyNodes: PropertyNode[] | undefined = properties
    ?.map(property => {
      return { ...property.property };
    })
    .sort();

  const [searchString, setSearchString] = useState<string>(() => '');
  const columnDescriptions: ColumnDescription<ImportRow>[] = [
    {
      key: 'code',
      width: 50,
      sortable: false,
      label: 'label.code',
    },
    {
      key: 'name',
      width: 150,
      sortable: false,
      label: 'label.name',
      Cell: TooltipTextCell,
    },
  ];
  propertyNodes?.map(property =>
    columnDescriptions.push({
      key: property.key,
      width: 100,
      sortable: false,
      label: undefined,
      labelProps: { defaultValue: property.name },
      Cell: TooltipTextCell,
    })
  );

  {
    columnDescriptions.push({
      key: 'errorMessage',
      label: 'label.error-message',
      width: 150,
      Cell: TooltipTextCell,
    });
  }

  const rowsWithProperties = rows.map(row => {
    return { ...row, ...row.properties };
  });

  const columns = useColumns<ImportRow>(columnDescriptions, {}, []);

  const filteredEquipment = rowsWithProperties.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.name.includes(searchString) ||
      (row.code && row.code.includes(searchString)) ||
      (row.errorMessage && row.errorMessage.includes(searchString)) ||
      row.id === searchString
    );
  });
  const currentFacilitiesPage = filteredEquipment.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  // console.log('currentFacilitiesPage', currentFacilitiesPage);

  return (
    <Grid flexDirection="column" display="flex" gap={0}>
      <SearchBar
        placeholder={t('messages.search')}
        value={searchString}
        debounceTime={300}
        onChange={newValue => {
          setSearchString(newValue);
          setPagination({
            first: pagination.first,
            offset: 0,
            page: 0,
          });
        }}
      />
      <DataTable
        pagination={{
          ...pagination,
          total: filteredEquipment.length,
        }}
        onChangePage={page => {
          setPagination({
            first: pagination.first,
            offset: pagination.first * page,
            page: page,
          });
        }}
        columns={columns}
        data={currentFacilitiesPage}
        noDataElement={<NothingHere body={t('error.asset-not-found')} />}
        id={''}
      />
    </Grid>
  );
};
