use crate::{
    diesel_macros::diesel_json_type,
    dynamic_query_filter::create_condition,
    ChangeLogInsertRow, ChangelogCondition, ChangelogRepository, ChangelogSyncType,
    ChangelogTableName, RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
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
        match serde_json::to_string(&self.0) {
            Ok(s) => write!(f, "SyncRequestFilter({s})"),
            Err(_) => write!(f, "SyncRequestFilter(<unserializable>)"),
        }
    }
}

// PartialEq via the JSON form so SyncRequestRow can derive PartialEq cleanly.
// `ChangelogCondition::Inner` carries diesel boxed expressions and isn't
// directly comparable, but serializes deterministically.
impl PartialEq for SyncRequestFilter {
    fn eq(&self, other: &Self) -> bool {
        match (
            serde_json::to_string(&self.0),
            serde_json::to_string(&other.0),
        ) {
            (Ok(a), Ok(b)) => a == b,
            _ => false,
        }
    }
}


table! {
    sync_request(id) {
        id -> Text,
        reference_id -> Nullable<Text>,
        description -> Text,
        store_id -> Nullable<Text>,
        pull_filter -> Nullable<Text>,
        push_filter -> Nullable<Text>,
        created_datetime -> Timestamp,
        finished_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone,
    Queryable,
    Selectable,
    Insertable,
    Deserialize,
    Serialize,
    AsChangeset,
    Debug,
    PartialEq,
)]
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
    /// Free-text description shown on the UI. The front-end resolves
    /// sync_log_v7.reference_id -> sync_request(s) and shows their
    /// descriptions verbatim. Translation, if any, is the caller's
    /// responsibility before insertion.
    pub description: String,
    /// Routing key used by the SyncRequest sync style on central: the row pulls
    /// to whichever site currently has this store active. NULL for local-only
    /// rows that don't propagate via sync (e.g. self-resync of sync_request).
    pub store_id: Option<String>,
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

    /// Local-only upsert (no changelog). Used during sync integrate where the
    /// caller supplies a pre-built changelog row, and from `upsert_one`.
    pub fn _upsert_one(&self, row: &SyncRequestRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_request::table)
            .values(row)
            .on_conflict(sync_request::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Upsert + generate changelog row sourced from this site. Use this when
    /// authoring a sync_request locally (e.g. central creating one for a
    /// transferred store, or a remote queueing post-init backfill).
    pub fn upsert_one(&self, row: &SyncRequestRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = SyncRequestRow::generate_changelog(
            row,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
            self.connection,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

impl SyncRequestRow {
    /// Build the changelog row for a sync_request upsert/delete. `store_id` is
    /// copied across so the SyncRequest sync style can route to the site
    /// currently hosting that store.
    pub(crate) fn generate_changelog(
        row: &SyncRequestRow,
        action: RowActionType,
        source_site_id: SourceSiteId,
        connection: &StorageConnection,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::SyncRequest,
            record_id: row.id.clone(),
            row_action: action,
            store_id: row.store_id.clone(),
            source_site_id: source_site_id.get_id(connection)?,
            ..Default::default()
        })
    }
}

impl Upsert for SyncRequestRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SyncRequestRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
                con,
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SyncRequestRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{
        dynamic_query_filter::FilterBuilder,
        mock::{MockData, MockDataInserts},
        test_db, ChangelogCondition, SyncRequestCondition, SyncRequestFilter,
        SyncRequestRepository, SyncRequestRow,
    };

    use chrono::NaiveDateTime;

    fn row(id: &str) -> SyncRequestRow {
        SyncRequestRow {
            id: id.to_string(),
            reference_id: None,
            description: format!("desc_{id}"),
            store_id: None,
            pull_filter: Some(SyncRequestFilter(ChangelogCondition::True())),
            push_filter: None,
            created_datetime: NaiveDateTime::default(),
            finished_datetime: None,
        }
    }

    #[actix_rt::test]
    async fn test_sync_request() {
        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_sync_request",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let repo = SyncRequestRepository::new(&connection);
        // Filter out the migration-seeded self-resync row so the test
        // operates on a clean slice (id-prefixed rows it inserts itself).
        let active = || -> Vec<SyncRequestRow> {
            repo.query(SyncRequestCondition::FinishedDatetime::is_null())
                .unwrap()
                .into_iter()
                .filter(|r| r.id == "a" || r.id == "b")
                .collect()
        };

        // empty (excluding the seed)
        assert!(active().is_empty());

        // insert two
        repo._upsert_one(&row("a")).unwrap();
        repo._upsert_one(&row("b")).unwrap();
        assert_eq!(active().len(), 2);

        // finishing one removes it from active
        let finished_at = NaiveDateTime::default() + chrono::Duration::seconds(60);
        repo.mark_finished_many(&["a".to_string()], finished_at)
            .unwrap();
        let after_finish = active();
        assert_eq!(after_finish.len(), 1);
        assert_eq!(after_finish[0].id, "b");

        // upsert overwrites
        let mut updated = row("b");
        updated.description = "new".to_string();
        repo._upsert_one(&updated).unwrap();
        assert_eq!(active()[0].description, "new");
    }
}
