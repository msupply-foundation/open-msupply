use super::{
    requisition_row::requisition,
    RequisitionFilter, RequisitionRow, RequisitionSort, RequisitionSortField,
};

use crate::{
    db_diesel::{
        invoice_row::invoice, name_row::name, period::period_row::period,
        program_requisition::program_row::program, store_row::store,
    },
    diesel_macros::{
        apply_date_filter, apply_date_time_filter, apply_equal_filter, apply_sort,
        apply_sort_no_case, apply_string_filter,
    },
    repository_error::RepositoryError,
    DBType, EqualFilter, NameRow, PeriodRow, ProgramRow, StorageConnection, StoreRow,
};

use crate::Pagination;
use diesel::{
    dsl::{sum, IntoBoxed},
    prelude::*,
};

pub type RequisitionJoin = (
    RequisitionRow,
    NameRow,
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

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<RequisitionJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    requisition::table
        .inner_join(name::table)
        .inner_join(store::table)
        .left_join(program::table)
        .left_join(period::table)
}

type BoxedRequisitionQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(
    filter: Option<RequisitionFilter>,
) -> Result<BoxedRequisitionQuery, RepositoryError> {
    let mut query = query().into_boxed();

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
        is_emergency,
        automatically_created,
        is_program_requisition,
        has_outstanding_lines,
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

        if let Some(is_emergency) = is_emergency {
            query = query.filter(requisition::is_emergency.eq(is_emergency))
        }

        if let Some(automatically_created) = automatically_created {
            apply_equal_filter!(
                query,
                Some(EqualFilter::<String>::is_null(automatically_created)),
                requisition::linked_requisition_id
            );
        }

        if is_program_requisition.is_some() {
            query = query.filter(requisition::program_id.is_not_null());
        }

        if let Some(a_shipment_has_been_created) = a_shipment_has_been_created {
            let requisition_ids = invoice::table.select(invoice::requisition_id).into_boxed();

            if a_shipment_has_been_created {
                query = query.filter(requisition::id.nullable().eq_any(requisition_ids))
            } else {
                query = query.filter(requisition::id.nullable().ne_all(requisition_ids))
            }
        }

        if let Some(has_outstanding_lines) = has_outstanding_lines {
            use crate::db_diesel::requisition_line_row::requisition_line;

            let requisition_ids = requisition_line::table
                .select(requisition_line::requisition_id)
                .group_by(requisition_line::requisition_id)
                .having(
                    sum(requisition_line::requested_quantity)
                        .gt(sum(requisition_line::supply_quantity)),
                )
                .into_boxed();

            if has_outstanding_lines {
                query = query.filter(requisition::id.eq_any(requisition_ids))
            } else {
                query = query.filter(requisition::id.ne_all(requisition_ids))
            }
        }
    }

    Ok(query)
}

fn to_domain(
    (requisition_row, name_row, store_row, program, period_row): RequisitionJoin,
) -> Requisition {
    Requisition {
        requisition_row,
        name_row,
        store_row,
        program,
        period: period_row,
    }
}
