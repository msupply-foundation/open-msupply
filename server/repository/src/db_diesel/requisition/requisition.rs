use super::{
    requisition_row::requisition, RequisitionFilter, RequisitionRow, RequisitionSort,
    RequisitionSortField,
};

use crate::{
    db_diesel::{
        invoice_row::invoice, name_link_row::name_link, name_row::name, period::period_row::period,
        program_requisition::program_row::program, store_row::store,
    },
    diesel_macros::{
        apply_date_filter, apply_date_time_filter, apply_equal_filter, apply_sort,
        apply_sort_no_case, apply_string_filter,
    },
    repository_error::RepositoryError,
    DBType, NameLinkRow, NameRow, PeriodRow, ProgramRow, StorageConnection, StoreRow,
};

use crate::Pagination;
use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    helper_types::LeftJoin,
    prelude::*,
};

pub type RequisitionJoin = (
    RequisitionRow,
    (NameLinkRow, NameRow),
    StoreRow,
    Option<ProgramRow>,
    Option<PeriodRow>,
);

#[derive(Debug, PartialEq, Clone, Default)]
pub struct Requisition {
    pub requisition_row: RequisitionRow,
    pub name_row: NameRow,
    pub store_row: StoreRow,
    pub program: Option<ProgramRow>,
    pub period: Option<PeriodRow>,
}

pub struct RequisitionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionRepository { connection }
    }

    pub fn count(&self, filter: Option<RequisitionFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter)?;
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: RequisitionFilter,
    ) -> Result<Vec<Requisition>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: RequisitionFilter,
    ) -> Result<Option<Requisition>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<RequisitionFilter>,
        sort: Option<RequisitionSort>,
    ) -> Result<Vec<Requisition>, RepositoryError> {
        let mut query = create_filtered_query(filter)?;

        if let Some(sort) = sort {
            match sort.key {
                RequisitionSortField::RequisitionNumber => {
                    apply_sort!(query, sort, requisition::requisition_number);
                }
                RequisitionSortField::Type => {
                    apply_sort!(query, sort, requisition::type_);
                }
                RequisitionSortField::Status => {
                    apply_sort!(query, sort, requisition::status);
                }
                RequisitionSortField::Comment => {
                    apply_sort_no_case!(query, sort, requisition::comment);
                }
                RequisitionSortField::OtherPartyName => {
                    apply_sort_no_case!(query, sort, name::name_);
                }
                RequisitionSortField::SentDatetime => {
                    apply_sort!(query, sort, requisition::sent_datetime);
                }
                RequisitionSortField::CreatedDatetime => {
                    apply_sort!(query, sort, requisition::created_datetime);
                }
                RequisitionSortField::FinalisedDatetime => {
                    apply_sort!(query, sort, requisition::finalised_datetime);
                }
                RequisitionSortField::ExpectedDeliveryDate => {
                    apply_sort!(query, sort, requisition::expected_delivery_date);
                }
                RequisitionSortField::TheirReference => {
                    apply_sort_no_case!(query, sort, requisition::their_reference);
                }
                RequisitionSortField::OrderType => {
                    apply_sort_no_case!(query, sort, requisition::order_type);
                }
                RequisitionSortField::PeriodStartDate => {
                    apply_sort!(query, sort, period::start_date);
                }
                RequisitionSortField::ProgramName => {
                    apply_sort_no_case!(query, sort, program::name);
                }
            }
        } else {
            query = query.order(requisition::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<RequisitionJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedRequisitionQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<
            InnerJoin<
                InnerJoin<requisition::table, InnerJoin<name_link::table, name::table>>,
                store::table,
            >,
            program::table,
        >,
        period::table,
    >,
    DBType,
>;

fn create_filtered_query(
    filter: Option<RequisitionFilter>,
) -> Result<BoxedRequisitionQuery, RepositoryError> {
    let mut query = requisition::table
        .inner_join(name_link::table.inner_join(name::table))
        .inner_join(store::table)
        .left_join(program::table)
        .left_join(period::table)
        .into_boxed();

    if let Some(RequisitionFilter {
        id,
        user_id,
        requisition_number,
        r#type,
        status,
        created_datetime,
        sent_datetime,
        finalised_datetime,
        expected_delivery_date,
        name_id,
        name,
        colour,
        their_reference,
        comment,
        store_id,
        linked_requisition_id,
        order_type,
        a_shipment_has_been_created,
        elmis_code,
        period_id,
        program_id,
    }) = filter
    {
        apply_equal_filter!(query, id, requisition::id);
        apply_equal_filter!(
            query,
            linked_requisition_id,
            requisition::linked_requisition_id
        );
        apply_equal_filter!(query, requisition_number, requisition::requisition_number);
        apply_equal_filter!(query, r#type, requisition::type_);
        apply_equal_filter!(query, status, requisition::status);
        apply_equal_filter!(query, user_id, requisition::user_id);

        apply_date_time_filter!(query, created_datetime, requisition::created_datetime);
        apply_date_time_filter!(query, sent_datetime, requisition::sent_datetime);
        apply_date_time_filter!(query, finalised_datetime, requisition::finalised_datetime);
        apply_date_filter!(
            query,
            expected_delivery_date,
            requisition::expected_delivery_date
        );

        apply_equal_filter!(query, name_id, name::id);
        apply_string_filter!(query, name, name::name_);
        apply_equal_filter!(query, colour, requisition::colour);
        apply_string_filter!(query, their_reference, requisition::their_reference);
        apply_string_filter!(query, comment, requisition::comment);

        apply_equal_filter!(query, store_id, requisition::store_id);
        apply_equal_filter!(query, order_type, requisition::order_type);
        apply_equal_filter!(query, elmis_code, program::elmis_code);
        apply_equal_filter!(query, period_id, period::id);
        apply_equal_filter!(query, program_id, program::id);

        if let Some(a_shipment_has_been_created) = a_shipment_has_been_created {
            let requisition_ids = invoice::table.select(invoice::requisition_id).into_boxed();

            if a_shipment_has_been_created {
                query = query.filter(requisition::id.nullable().eq_any(requisition_ids))
            } else {
                query = query.filter(requisition::id.nullable().ne_all(requisition_ids))
            }
        }
    }

    Ok(query)
}

fn to_domain(
    (requisition_row, (_, name_row), store_row, program, period_row): RequisitionJoin,
) -> Requisition {
    Requisition {
        requisition_row,
        name_row,
        store_row,
        program,
        period: period_row,
    }
}
