use super::asset_log_reason_row::{
    asset_log_reason::{self, dsl as asset_log_reason_dsl},
    AssetLogReasonRow,
};
use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    asset_log_row::AssetLogStatus,
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub type AssetLogReason = AssetLogReasonRow;

pub enum AssetLogReasonSortField {
    AssetLogStatus,
    Reason,
}

pub type AssetLogReasonSort = Sort<AssetLogReasonSortField>;

#[derive(Clone, Default)]

pub struct AssetLogReasonFilter {
    pub id: Option<EqualFilter<String>>,
    pub asset_log_status: Option<EqualFilter<AssetLogStatus>>,
    pub reason: Option<StringFilter>,
}

impl AssetLogReasonFilter {
    pub fn new() -> AssetLogReasonFilter {
        Self::default()
    }
    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn asset_log_status(mut self, filter: EqualFilter<AssetLogStatus>) -> Self {
        self.asset_log_status = Some(filter);
        self
    }
    pub fn reason(mut self, filter: StringFilter) -> Self {
        self.reason = Some(filter);
        self
    }
}

pub struct AssetLogReasonRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogReasonRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogReasonRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetLogReasonFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_one(
        &self,
        filter: AssetLogReasonFilter,
    ) -> Result<Option<AssetLogReasonRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetLogReasonFilter,
    ) -> Result<Vec<AssetLogReasonRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetLogReasonFilter>,
        sort: Option<AssetLogReasonSort>,
    ) -> Result<Vec<AssetLogReasonRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetLogReasonSortField::Reason => {
                    apply_sort_no_case!(query, sort, asset_log_reason_dsl::reason);
                }
                AssetLogReasonSortField::AssetLogStatus => {
                    apply_sort_no_case!(query, sort, asset_log_reason_dsl::asset_log_status);
                }
            }
        } else {
            query = query.order(asset_log_reason_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetLogReason>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_log_reason_row: AssetLogReasonRow) -> AssetLogReason {
    asset_log_reason_row
}

type BoxedAssetLogReasonQuery = IntoBoxed<'static, asset_log_reason::table, DBType>;

fn create_filtered_query(filter: Option<AssetLogReasonFilter>) -> BoxedAssetLogReasonQuery {
    let mut query = asset_log_reason_dsl::asset_log_reason.into_boxed();

    if let Some(f) = filter {
        let AssetLogReasonFilter {
            id,
            asset_log_status,
            reason,
        } = f;

        apply_equal_filter!(query, id, asset_log_reason_dsl::id);
        apply_equal_filter!(
            query,
            asset_log_status,
            asset_log_reason_dsl::asset_log_status
        );

        apply_string_filter!(query, reason, asset_log_reason_dsl::reason);
    }
    query.filter(asset_log_reason_dsl::deleted_datetime.is_null())
}
