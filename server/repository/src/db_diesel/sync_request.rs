use crate::{
    diesel_macros::diesel_json_type, dynamic_query_filter::create_condition, ChangelogCondition,
    ChangelogSyncType, RepositoryError, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

// Filter columns wrap a serializable ChangelogCondition::Inner so the macro-derived
// filter enum is stored as JSON text in a single column. Both pull and push reuse
// the same wrapper type. ChangelogCondition::Inner doesn't derive Debug/PartialEq,
// so we provide a minimal Debug impl that defers to the JSON form.
diesel_json_type! {
    #[derive(Clone)]
    pub struct SyncRequestFilter(pub ChangelogCondition::Inner);
}

impl std::fmt::Debug for SyncRequestFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Debug unimplemented for SyncRequestFilter")
    }
}

// Localisable description payload stored as JSON text. Each variant carries
// just the localisation parameters; the frontend renders the user-facing
// string from `kind` and the parameters.
diesel_json_type! {
    #[derive(Clone, Debug)]
    #[serde(tag = "kind")]
    pub enum Description {
        AllStoreData { store_name: String },
        TableName { table_name: String },
    }
}

table! {
    sync_request(id) {
        id -> Text,
        reference_id -> Nullable<Text>,
        description -> Text,
        pull_filter -> Nullable<Text>,
        push_filter -> Nullable<Text>,
        created_datetime -> Timestamp,
        finished_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Queryable, Selectable, Insertable, Deserialize, Debug, Serialize, AsChangeset)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sync_request)]
pub struct SyncRequestRow {
    pub id: String,
    /// UUID stamped onto `sync_buffer.reference_id` and `sync_log_v7.reference_id`.
    /// NULL until the runner first picks the request up; assigned then and
    /// shared by every request joined into the same group. The dynamic cursor
    /// ids used by the runner are derived from this: `pull_<reference_id>` and
    /// `push_<reference_id>`.
    pub reference_id: Option<String>,
    /// Localisable description payload, stored as JSON. The frontend resolves
    /// `sync_log_v7.reference_id` -> sync_request rows and renders each
    /// description using the user's locale.
    pub description: Description,
    /// pull_filter is either Some (pull is configured) or None.
    pub pull_filter: Option<SyncRequestFilter>,
    pub push_filter: Option<SyncRequestFilter>,
    pub created_datetime: NaiveDateTime,
    pub finished_datetime: Option<NaiveDateTime>,
}

type Source = sync_request::table;

create_condition!(
    SyncRequestCondition,
    Source,
    (Id, string, sync_request::id),
    (ReferenceId, string, sync_request::reference_id),
    (
        FinishedDatetime,
        NaiveDateTime,
        sync_request::finished_datetime
    ),
);

pub struct SyncRequestRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncRequestRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    /// Local-only upsert. sync_request is a remote-site-only record; it is not
    /// included in the changelog and never propagates over sync.
    pub fn upsert_one(&self, row: &SyncRequestRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_request::table)
            .values(row)
            .on_conflict(sync_request::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SyncRequestRow>, RepositoryError> {
        Ok(sync_request::table
            .filter(sync_request::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SyncRequestRow>, RepositoryError> {
        Ok(sync_request::table
            .filter(sync_request::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        filter: SyncRequestCondition::Inner,
    ) -> Result<Vec<SyncRequestRow>, RepositoryError> {
        let rows = sync_request::table
            .filter(filter.to_boxed())
            .order(sync_request::created_datetime.asc())
            .load::<SyncRequestRow>(self.connection.lock().connection())?;
        Ok(rows)
    }

    /// Mark a set of requests finished in one statement. Errors propagate from
    /// the surrounding transaction.
    pub fn mark_finished_many(
        &self,
        ids: &[String],
        finished_datetime: NaiveDateTime,
    ) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::update(sync_request::table.filter(sync_request::id.eq_any(ids)))
            .set(sync_request::finished_datetime.eq(Some(finished_datetime)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for SyncRequestRow {
    /// sync_request is a remote-local-only record and is not in the changelog,
    /// so the sync_type is ignored. Only `upsert_local` should be used in
    /// practice (via the v7 translator); this is provided for completeness.
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        _sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SyncRequestRepository::new(con).upsert_one(self)
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        // Not implemented
    }
}
