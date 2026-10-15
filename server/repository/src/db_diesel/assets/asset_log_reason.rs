use super::asset_log_reason_row::{AssetLogReasonRow, asset_log_reason};
use diesel::{
    dsl::{IntoBoxed, sql},
    prelude::*,
    sql_types::Text,
};

use crate::{
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
    asset_log_row::AssetLogStatus,
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
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

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
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
                    apply_sort_no_case!(query, sort, asset_log_reason::reason);
                }
                AssetLogReasonSortField::AssetLogStatus => {
                    // By the status text, as SQLite does. Postgres would order
                    // its enum by declaration order, which reads as random.
                    apply_sort!(
                        query,
                        sort,
                        sql::<Text>("CAST(asset_log_reason.asset_log_status AS TEXT)")
                    );
                }
            }
        } else {
            query = query.order(asset_log_reason::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetLogReason>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_log_reason_row: AssetLogReasonRow) -> AssetLogReason {
    asset_log_reason_row
}

type BoxedAssetLogReasonQuery = IntoBoxed<'static, asset_log_reason::table, DBType>;

fn create_filtered_query(filter: Option<AssetLogReasonFilter>) -> BoxedAssetLogReasonQuery {
    let mut query = asset_log_reason::table.into_boxed();

    if let Some(f) = filter {
        let AssetLogReasonFilter {
            id,
            asset_log_status,
            reason,
        } = f;

        apply_equal_filter!(query, id, asset_log_reason::id);
        apply_equal_filter!(query, asset_log_status, asset_log_reason::asset_log_status);

        apply_string_filter!(query, reason, asset_log_reason::reason);
    }
    query.filter(asset_log_reason::deleted_datetime.is_null())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        asset_log_reason_row::AssetLogReasonRowRepository, mock::MockDataInserts, test_db,
    };

    // Every sort key, both directions. Postgres rejects a collation on a
    // non-text column (enum, timestamp) when planning, so this needs no rows.
    #[actix_rt::test]
    async fn test_asset_log_reason_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_asset_log_reason_sort", MockDataInserts::none()).await;
        let repo = AssetLogReasonRepository::new(&connection);

        for desc in [false, true] {
            for key in [
                AssetLogReasonSortField::AssetLogStatus,
                AssetLogReasonSortField::Reason,
            ] {
                let sort = Sort {
                    key,
                    desc: Some(desc),
                };
                repo.query(Pagination::all(), None, Some(sort)).unwrap();
            }
        }
    }

    // Status sorts by its text on both databases, not by the Postgres enum's
    // declaration order (NOT_IN_USE, FUNCTIONING, ...).
    #[actix_rt::test]
    async fn test_asset_log_reason_status_sort_order() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_asset_log_reason_status_sort_order",
            MockDataInserts::none(),
        )
        .await;
        let row_repo = AssetLogReasonRowRepository::new(&connection);
        for (id, status) in [
            ("a", AssetLogStatus::NotInUse),
            ("b", AssetLogStatus::Functioning),
            ("c", AssetLogStatus::FunctioningButNeedsAttention),
            ("d", AssetLogStatus::NotFunctioning),
            ("e", AssetLogStatus::Decommissioned),
            ("f", AssetLogStatus::Unserviceable),
        ] {
            row_repo
                .upsert_one(&AssetLogReasonRow {
                    id: id.to_string(),
                    asset_log_status: status,
                    reason: id.to_string(),
                    ..Default::default()
                })
                .unwrap();
        }

        // The status groups in order (migrations also seed reasons, so a
        // status can repeat).
        let statuses = |desc| {
            let sort = Sort {
                key: AssetLogReasonSortField::AssetLogStatus,
                desc: Some(desc),
            };
            let mut statuses = AssetLogReasonRepository::new(&connection)
                .query(Pagination::all(), None, Some(sort))
                .unwrap()
                .into_iter()
                .map(|row| row.asset_log_status)
                .collect::<Vec<_>>();
            statuses.dedup();
            statuses
        };

        let ascending = vec![
            AssetLogStatus::Decommissioned,
            AssetLogStatus::Functioning,
            AssetLogStatus::FunctioningButNeedsAttention,
            AssetLogStatus::NotFunctioning,
            AssetLogStatus::NotInUse,
            AssetLogStatus::Unserviceable,
        ];
        assert_eq!(statuses(false), ascending);
        assert_eq!(
            statuses(true),
            ascending.into_iter().rev().collect::<Vec<_>>()
        );
    }
}
