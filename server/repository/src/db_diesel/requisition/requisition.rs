use super::{
    requisition_row::{requisition, requisition::dsl as requisition_dsl},
    RequisitionRow,
};

use crate::{
    db_diesel::name_row::{name, name::dsl as name_dsl, NameRow},
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_simple_string_filter, apply_sort,
        apply_sort_no_case,
    },
    repository_error::RepositoryError,
    DBType, StorageConnection,
};

use crate::Pagination;
use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

use super::{RequisitionFilter, RequisitionSort, RequisitionSortField};

pub type RequisitionJoin = (RequisitionRow, NameRow);

#[derive(Debug, PartialEq, Clone, Default)]
pub struct Requisition {
    pub requisition_row: RequisitionRow,
    pub name_row: NameRow,
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
        Ok(query.count().get_result(&self.connection.connection)?)
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
                    apply_sort!(query, sort, requisition_dsl::requisition_number);
                }
                RequisitionSortField::Type => {
                    apply_sort!(query, sort, requisition_dsl::type_);
                }
                RequisitionSortField::Status => {
                    apply_sort!(query, sort, requisition_dsl::status);
                }
                RequisitionSortField::Comment => {
                    apply_sort_no_case!(query, sort, requisition_dsl::comment);
                }
                RequisitionSortField::OtherPartyName => {
                    apply_sort_no_case!(query, sort, name_dsl::name_);
                }
                RequisitionSortField::SentDatetime => {
                    apply_sort!(query, sort, requisition_dsl::sent_datetime);
                }
                RequisitionSortField::CreatedDatetime => {
                    apply_sort!(query, sort, requisition_dsl::created_datetime);
                }
                RequisitionSortField::FinalisedDatetime => {
                    apply_sort!(query, sort, requisition_dsl::finalised_datetime);
                }
            }
        } else {
            query = query.order(requisition_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<RequisitionJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedRequisitionQuery = IntoBoxed<'static, InnerJoin<requisition::table, name::table>, DBType>;

fn create_filtered_query(
    filter: Option<RequisitionFilter>,
) -> Result<BoxedRequisitionQuery, RepositoryError> {
    let mut query = requisition_dsl::requisition
        .inner_join(name_dsl::name)
        .into_boxed();

    if let Some(RequisitionFilter {
        id,
        requisition_number,
        r#type,
        status,
        created_datetime,
        sent_datetime,
        finalised_datetime,
        name_id,
        name,
        colour,
        their_reference,
        comment,
        store_id,
        linked_requisition_id,
    }) = filter
    {
        apply_equal_filter!(query, id, requisition_dsl::id);
        apply_equal_filter!(
            query,
            linked_requisition_id,
            requisition_dsl::linked_requisition_id
        );
        apply_equal_filter!(
            query,
            requisition_number,
            requisition_dsl::requisition_number
        );
        apply_equal_filter!(query, r#type, requisition_dsl::type_);
        apply_equal_filter!(query, status, requisition_dsl::status);

        apply_date_time_filter!(query, created_datetime, requisition_dsl::created_datetime);
        apply_date_time_filter!(query, sent_datetime, requisition_dsl::sent_datetime);
        apply_date_time_filter!(
            query,
            finalised_datetime,
            requisition_dsl::finalised_datetime
        );

        apply_equal_filter!(query, name_id, requisition_dsl::name_id);
        apply_simple_string_filter!(query, name, name_dsl::name_);
        apply_equal_filter!(query, colour, requisition_dsl::colour);
        apply_simple_string_filter!(query, their_reference, requisition_dsl::their_reference);
        apply_simple_string_filter!(query, comment, requisition_dsl::comment);

        apply_equal_filter!(query, store_id, requisition_dsl::store_id);
    }

    Ok(query)
}

fn to_domain((requisition_row, name_row): RequisitionJoin) -> Requisition {
    Requisition {
        requisition_row,
        name_row,
    }
}
