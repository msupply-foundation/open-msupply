use std::ops::Deref;

use crate::{
    diesel_macros::diesel_json_type, dynamic_query::create_condition, ChangeLogInsertRowV7,
    ChangelogTableName, RepositoryError, RowActionType, StorageConnection,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    sync_buffer_v7 (record_id) {
        record_id -> Text,
        table_name -> Text,
        action -> crate::db_diesel::changelog::RowActionTypeMapping,
        data -> Text,
        store_id -> Nullable<Text>,
        name_id -> Nullable<Text>,
        received_datetime -> Timestamp,
        integration_datetime -> Nullable<Timestamp>,
        integration_error -> Nullable<Text>,
        source_site_id -> Nullable<Integer>,
    }
}

diesel_json_type! {
    #[derive(Clone, Debug, Default, PartialEq)]
    pub struct SyncRecordData(pub serde_json::Value);
}

impl Deref for SyncRecordData {
    type Target = serde_json::Value;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(
    Clone, Default, Queryable, Insertable, Serialize, Deserialize, Debug, AsChangeset, PartialEq,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sync_buffer_v7)]
pub struct SyncBufferV7Row {
    pub record_id: String,
    #[diesel(deserialize_as = String)]
    pub table_name: ChangelogTableName,
    pub action: RowActionType,
    pub data: SyncRecordData,
    pub store_id: Option<String>,
    pub name_id: Option<String>,
    // Not in sync
    #[serde(skip)]
    pub received_datetime: NaiveDateTime,
    #[serde(skip)]
    pub integration_datetime: Option<NaiveDateTime>,
    #[serde(skip)]
    pub integration_error: Option<String>,
    #[serde(skip)]
    pub source_site_id: Option<i32>,
}

type Source = sync_buffer_v7::table;

create_condition!(
    Source,
    (record_id, string, sync_buffer_v7::record_id),
    (source_site_id, i32, sync_buffer_v7::source_site_id),
    (store_id, string, sync_buffer_v7::store_id),
    (name_id, string, sync_buffer_v7::name_id),
    (
        integration_datetime,
        NaiveDateTime,
        sync_buffer_v7::integration_datetime
    ),
);

pub struct SyncBufferV7Repository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncBufferV7Repository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    pub fn upsert(&self, row: &SyncBufferV7Row) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_buffer_v7::table)
            .values(row)
            .on_conflict(sync_buffer_v7::record_id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_many(&self, rows: &[SyncBufferV7Row]) -> Result<(), RepositoryError> {
        for row in rows {
            self.upsert(row)?;
        }
        Ok(())
    }

    pub fn query(
        &self,
        filter: Option<Condition::Inner>,
    ) -> Result<Vec<SyncBufferV7Row>, RepositoryError> {
        let mut query = sync_buffer_v7::table.into_boxed();
        if let Some(filter) = filter {
            query = query.filter(filter.to_boxed());
        }
        let results = query.load::<SyncBufferV7Row>(self.connection.lock().connection())?;
        Ok(results)
    }
}

impl SyncBufferV7Row {
    pub fn to_changelog_extra(self) -> ChangeLogInsertRowV7 {
        let Self {
            name_id,
            store_id,
            source_site_id,
            ..
        } = self;

        ChangeLogInsertRowV7 {
            name_link_id: name_id,
            store_id,
            source_site_id,
            ..Default::default()
        }
    }
}
