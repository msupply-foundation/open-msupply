use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            name, name::dsl as name_dsl, requisition, requisition::dsl as requisition_dsl,
        },
        NameRow, RequisitionRow,
    },
    DBType, StorageConnection,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};
use domain::Pagination;

use super::{RequisitionFilter, RequisitionSort, RequisitionSortField};

pub type RequisitionJoin = (RequisitionRow, NameRow);

#[derive(Debug)]
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

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, requisition_dsl::id);
        apply_equal_filter!(
            query,
            f.requisition_number,
            requisition_dsl::requisition_number
        );
        apply_equal_filter!(query, f.r#type, requisition_dsl::type_);
        apply_equal_filter!(query, f.status, requisition_dsl::status);

        apply_date_time_filter!(query, f.created_datetime, requisition_dsl::created_datetime);
        apply_date_time_filter!(query, f.sent_datetime, requisition_dsl::sent_datetime);
        apply_date_time_filter!(
            query,
            f.finalised_datetime,
            requisition_dsl::finalised_datetime
        );

        apply_equal_filter!(query, f.name_id, requisition_dsl::name_id);
        apply_equal_filter!(query, f.name, name_dsl::name_);
        apply_equal_filter!(query, f.color, requisition_dsl::color);
        apply_equal_filter!(query, f.their_reference, requisition_dsl::their_reference);
        apply_equal_filter!(query, f.comment, requisition_dsl::comment);
    }

    Ok(query)
}

fn to_domain((requisition_row, name_row): RequisitionJoin) -> Requisition {
    Requisition {
        requisition_row,
        name_row,
    }
}
