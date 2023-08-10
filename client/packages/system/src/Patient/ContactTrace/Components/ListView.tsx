import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  ContactTraceSortFieldInput,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useContactTraces } from '@openmsupply-client/programs';
import { usePatient } from '../../api';
import { createQueryParamsStore, useQueryParamsStore } from '@common/hooks';
import { ContactTraceRowFragment } from 'packages/programs/src/api/operations.generated';
import { useContactTraceListColumns } from 'packages/system/src/ContactTrace';
import { AppRoute } from 'packages/config/src';

const ContactTraceComponent: FC = () => {
  const {
    pagination: { page, first, offset, onChangePage },
  } = useQueryParamsStore();

  const { queryParams, updateSortQuery } = useUrlQueryParams();

  const patientId = usePatient.utils.id();

  const { data, isError, isLoading } = useContactTraces.document.list({
    sortBy: {
      key: queryParams.sortBy.key as ContactTraceSortFieldInput,
      isDesc: queryParams.sortBy.isDesc,
    },
    filterBy: { patientId: { equalTo: patientId } },
  });
  const pagination = { page, first, offset };
  const navigate = useNavigate();

  const columns = useContactTraceListColumns({
    sortBy: queryParams.sortBy,
    onChangeSortBy: updateSortQuery,
  });

  return (
    <DataTable
      id="contact-trace--list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={onChangePage}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.ContactTrace)
            .addPart(row.id)
            .build()
        );
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const ContactTraceListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ContactTraceRowFragment>({
      initialSortBy: {
        key: ContactTraceSortFieldInput.Datetime,
        isDesc: false,
      },
    })}
  >
    <ContactTraceComponent />
  </TableProvider>
);
