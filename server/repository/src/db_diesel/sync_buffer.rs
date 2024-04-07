use super::StorageConnection;
use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    repository_error::RepositoryError,
    DBType, DatetimeFilter, EqualFilter,
};
use chrono::NaiveDateTime;
use diesel::{dsl::IntoBoxed, prelude::*};
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncBufferAction {
    Upsert,
    Delete,
    Merge,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        received_datetime -> Timestamp,
        integration_datetime -> Nullable<Timestamp>,
        integration_error -> Nullable<Text>,
        table_name -> Text,
        action -> crate::SyncBufferActionMapping,
        data -> Text,
        source_site_id -> Nullable<Integer>,
    }
}

#[derive(
    Clone, Queryable, Insertable, Serialize, Deserialize, Debug, AsChangeset, PartialEq, Eq,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sync_buffer)]
pub struct SyncBufferRow {
    pub record_id: String,
    pub received_datetime: NaiveDateTime,
    pub integration_datetime: Option<NaiveDateTime>,
    pub integration_error: Option<String>,
    pub table_name: String,
    pub action: SyncBufferAction,
    pub data: String,
    pub source_site_id: Option<i32>,
}

impl Default for SyncBufferRow {
    fn default() -> Self {
        Self {
            record_id: Default::default(),
            received_datetime: Defaults::naive_date_time(),
            integration_datetime: Default::default(),
            integration_error: Default::default(),
            table_name: Default::default(),
            action: SyncBufferAction::Upsert,
            data: Default::default(),
            source_site_id: Default::default(),
        }
    }
}

pub struct SyncBufferRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

use serde::{Deserialize, Serialize};
use sync_buffer::dsl as sync_buffer_dsl;
use util::{inline_init, Defaults};

impl<'a> SyncBufferRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        SyncBufferRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &SyncBufferRow) -> Result<(), RepositoryError> {
        let statement = diesel::insert_into(sync_buffer_dsl::sync_buffer)
            .values(row)
            .on_conflict(sync_buffer_dsl::record_id)
            .do_update()
            .set(row);

        // //   Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&statement).to_string());

        statement.execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &SyncBufferRow) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_buffer_dsl::sync_buffer)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_many(&self, rows: &Vec<SyncBufferRow>) -> Result<(), RepositoryError> {
        for row in rows {
            self.upsert_one(row)?
        }
        Ok(())
    }

    pub fn get_all(&self) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        Ok(sync_buffer_dsl::sync_buffer.load(&mut self.connection.connection)?)
    }

    pub fn find_one_by_record_id(
        &self,
        record_id: &str,
    ) -> Result<Option<SyncBufferRow>, RepositoryError> {
        let result = sync_buffer_dsl::sync_buffer
            .filter(sync_buffer_dsl::record_id.eq(record_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

#[derive(Clone, Default)]
pub struct SyncBufferFilter {
    pub record_id: Option<EqualFilter<String>>,
    pub integration_datetime: Option<DatetimeFilter>,
    pub integration_error: Option<EqualFilter<String>>,
    pub action: Option<EqualFilter<SyncBufferAction>>,
    pub table_name: Option<EqualFilter<String>>,
}

impl SyncBufferFilter {
    pub fn new() -> SyncBufferFilter {
        SyncBufferFilter::default()
    }

    pub fn integration_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.integration_datetime = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn integration_error(mut self, filter: EqualFilter<String>) -> Self {
        self.integration_error = Some(filter);
        self
    }

    pub fn table_name(mut self, filter: EqualFilter<String>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn action(mut self, filter: EqualFilter<SyncBufferAction>) -> Self {
        self.action = Some(filter);
        self
    }
}

impl SyncBufferAction {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}

type SyncBuffer = SyncBufferRow;

pub struct SyncBufferRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> SyncBufferRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        SyncBufferRepository { connection }
    }

    pub fn query_by_filter(
        &self,
        filter: SyncBufferFilter,
    ) -> Result<Vec<SyncBuffer>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<SyncBufferFilter>,
    ) -> Result<Vec<SyncBuffer>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<SyncBuffer>(&mut self.connection.connection)?;

        Ok(result)
    }
}

type BoxedSyncBufferQuery = IntoBoxed<'static, sync_buffer::table, DBType>;

fn create_filtered_query(filter: Option<SyncBufferFilter>) -> BoxedSyncBufferQuery {
    let mut query = sync_buffer_dsl::sync_buffer.into_boxed();

    if let Some(f) = filter {
        let SyncBufferFilter {
            integration_datetime,
            integration_error,
            action,
            table_name,
            record_id,
        } = f;

        apply_equal_filter!(query, record_id, sync_buffer_dsl::record_id);
        apply_date_time_filter!(
            query,
            integration_datetime,
            sync_buffer_dsl::integration_datetime
        );
        apply_equal_filter!(query, integration_error, sync_buffer_dsl::integration_error);
        apply_equal_filter!(query, action, sync_buffer_dsl::action);
        apply_equal_filter!(query, table_name, sync_buffer_dsl::table_name);
    }

    query
}

#[cfg(test)]
mod test {
    use util::{inline_edit, inline_init, Defaults};

    use crate::{
        mock::{MockData, MockDataInserts},
        test_db, DatetimeFilter, EqualFilter, SyncBufferAction, SyncBufferFilter,
        SyncBufferRepository, SyncBufferRow, SyncBufferRowRepository,
    };

    pub fn row_a() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "store_a".to_string();
            r.integration_datetime = Some(Defaults::naive_date_time());
            r.action = SyncBufferAction::Upsert;
        })
    }

    pub fn row_b() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "store_b".to_string();
            r.integration_error = Some("error".to_string());
            r.action = SyncBufferAction::Delete;
        })
    }

    pub fn row_c() -> SyncBufferRow {
        inline_init(|r: &mut SyncBufferRow| {
            r.record_id = "store_c".to_string();
            r.action = SyncBufferAction::Upsert;
        })
    }

    #[actix_rt::test]
    async fn test_sync_buffer() {
        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_sync_buffer",
            MockDataInserts::none(),
            inline_init(|r: &mut MockData| {
                r.sync_buffer_rows = vec![row_a(), row_b(), row_c()];
            }),
        )
        .await;

        let repo = SyncBufferRepository::new(&mut connection);

        assert_eq!(
            repo.query_by_filter(
                SyncBufferFilter::new()
                    .integration_datetime(DatetimeFilter::is_null(true))
                    .integration_error(EqualFilter::is_null(true))
            )
            .unwrap(),
            vec![row_c()]
        );

        assert_eq!(
            repo.query_by_filter(
                SyncBufferFilter::new()
                    .integration_datetime(DatetimeFilter::is_null(true))
                    .integration_error(EqualFilter::is_null(true))
            )
            .unwrap(),
            vec![row_c()]
        );

        assert_eq!(
            repo.query_by_filter(
                SyncBufferFilter::new().action(SyncBufferAction::Delete.equal_to())
            )
            .unwrap(),
            vec![row_b()]
        );
        // Test upsert overwrites integration_datetime
        let new_a = inline_edit(&row_a(), |mut r| {
            r.integration_datetime = None;
            r
        });

        SyncBufferRowRepository::new(&mut connection)
            .upsert_one(&new_a)
            .unwrap();

        assert_eq!(
            repo.query_by_filter(
                SyncBufferFilter::new()
                    .integration_datetime(DatetimeFilter::is_null(true))
                    .record_id(EqualFilter::equal_to(&row_a().record_id))
            )
            .unwrap(),
            vec![new_a]
        );
    }
}
