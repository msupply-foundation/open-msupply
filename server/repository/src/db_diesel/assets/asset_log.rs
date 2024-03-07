use super::super::user_row::user_account::dsl as user_account_dsl;
use super::asset_log_row::{asset_log, asset_log::dsl as asset_log_dsl, AssetLogRow};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::asset_log_row::Status;
use crate::{
    diesel_macros::{
        apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter,
    },
    repository_error::RepositoryError,
    DBType, DatetimeFilter, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub type AssetLog = AssetLogRow;

pub enum AssetLogSortField {
    Status,
    LogDatetime,
}

pub type AssetLogSort = Sort<AssetLogSortField>;

#[derive(Clone)]
pub struct AssetLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub asset_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<Status>>,
    pub log_datetime: Option<DatetimeFilter>,
    pub user: Option<StringFilter>,
}

impl AssetLogFilter {
    pub fn new() -> AssetLogFilter {
        AssetLogFilter {
            id: None,
            asset_id: None,
            status: None,
            log_datetime: None,
            user: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn asset_id(mut self, filter: EqualFilter<String>) -> Self {
        self.asset_id = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<Status>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn log_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.log_datetime = Some(filter);
        self
    }
    pub fn user(mut self, filter: StringFilter) -> Self {
        self.user = Some(filter);
        self
    }
}

pub struct AssetLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetLogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_one(&self, filter: AssetLogFilter) -> Result<Option<AssetLog>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetLogFilter,
    ) -> Result<Vec<AssetLog>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetLogFilter>,
        sort: Option<AssetLogSort>,
    ) -> Result<Vec<AssetLog>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetLogSortField::LogDatetime => {
                    apply_sort!(query, sort, asset_log_dsl::log_datetime);
                }
                AssetLogSortField::Status => {
                    apply_sort_no_case!(query, sort, asset_log_dsl::status);
                }
            }
        } else {
            query = query.order(asset_log_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetLog>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_log_row: AssetLogRow) -> AssetLog {
    asset_log_row
}

type BoxedAssetLogQuery = IntoBoxed<'static, asset_log::table, DBType>;

fn create_filtered_query(filter: Option<AssetLogFilter>) -> BoxedAssetLogQuery {
    let mut query = asset_log_dsl::asset_log.into_boxed();

    if let Some(f) = filter {
        let AssetLogFilter {
            id,
            asset_id,
            status,
            log_datetime,
            user,
        } = f;

        apply_equal_filter!(query, id, asset_log_dsl::id);
        apply_equal_filter!(query, status, asset_log_dsl::status);
        apply_date_filter!(query, log_datetime, asset_log_dsl::log_datetime);

        apply_equal_filter!(query, asset_id, asset_log_dsl::asset_id);

        if let Some(user) = user {
            let mut sub_query = user_account_dsl::user_account
                .select(user_account_dsl::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(user), user_account_dsl::username);
            query = query.filter(asset_log_dsl::user_id.eq_any(sub_query));
        }
    }
    query
}

#[cfg(test)]

mod tests {
    use crate::{
        assets::asset_log::{AssetLogFilter, AssetLogRepository},
        mock::{mock_asset_log_c, mock_asset_logs, MockDataInserts},
        test_db, EqualFilter, Pagination,
    };

    use super::{AssetLogSort, AssetLogSortField};

    #[actix_rt::test]
    async fn test_asset_log_query_repository() {
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_asset_log_sort_query_repository",
            MockDataInserts::none().assets().asset_logs(),
        )
        .await;
        let asset_log_repository = AssetLogRepository::new(&storage_connection);

        // test query by one

        let asset_log_id = "log_a".to_string();
        let log = asset_log_repository
            .query_one(AssetLogFilter::new().id(EqualFilter::equal_to(&asset_log_id)))
            .unwrap()
            .unwrap();

        assert_eq!(log.id, asset_log_id);

        // test query multiple

        let logs = asset_log_repository
            .query(Pagination::new(), None, None)
            .unwrap();

        assert_eq!(logs.len(), mock_asset_logs().len());

        // test query multiple with sort

        let logs_sorted_by_datetime = asset_log_repository
            .query(
                Pagination::new(),
                None,
                Some(AssetLogSort {
                    key: AssetLogSortField::LogDatetime,
                    desc: None,
                }),
            )
            .unwrap();

        assert_eq!(logs_sorted_by_datetime[0], mock_asset_log_c());
    }
}
