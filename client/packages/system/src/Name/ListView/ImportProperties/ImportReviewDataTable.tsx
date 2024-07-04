import React, { FC, ReactElement, useState } from 'react';
import {
  ColumnDescription,
  DataTable,
  Grid,
  HeaderProps,
  NamePropertyNode,
  NothingHere,
  Pagination,
  PropertyNode,
  RecordWithId,
  SearchBar,
  TooltipTextCell,
  Typography,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { ImportRow } from './PropertiesImportModal';

interface ImportReviewDataTableProps {
  rows: ImportRow[];
  properties: NamePropertyNode[] | undefined;
}

const PropertyHeader = <T extends RecordWithId>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? '' : t(column.label, column.labelProps);
  return (
    <Typography
      sx={{
        display: '-webkit-box',
        overflow: 'ellipsis',
        fontWeight: 'bold',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
      }}
    >
      {header}
    </Typography>
  );
};

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
      width: 80,
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
      width: 150,
      sortable: false,
      label: undefined,
      labelProps: {
        defaultValue: property.name,
      },
      Cell: TooltipTextCell,
      Header: PropertyHeader,
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

  const filteredFacilities = rowsWithProperties.filter(row => {
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
  const currentFacilitiesPage = filteredFacilities.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  const tableHeight = window.innerHeight - 360;

  return (
    <Grid
      flexDirection="column"
      display="flex"
      gap={0}
      height={`${tableHeight}px`}
      minHeight="350px"
      maxHeight="700px"
    >
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
          total: filteredFacilities.length,
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
        noDataElement={<NothingHere body={t('error.facility-not-found')} />}
        id="facilities' properties review table"
        overflowX="auto"
      />
    </Grid>
  );
};
