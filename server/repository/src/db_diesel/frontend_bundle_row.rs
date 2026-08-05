use super::{ChangelogRepository, RowActionType, StorageConnection};

use crate::{repository_error::RepositoryError, ChangelogSyncType, Delete, SourceSiteId, Upsert};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    frontend_bundle (id) {
        id -> Text,
        version -> Text,
        server_version -> Text,
        sha256 -> Text,
        is_active -> Bool,
        description -> Nullable<Text>,
        created_datetime -> Timestamp,
    }
}

/// A published front-end bundle. The bundle's bytes live in a `sync_file_reference`
/// owned by this row (`table_name = "frontend_bundle"`, `record_id = id`); this record
/// is only the metadata a site needs in order to decide whether the bytes are worth
/// downloading at all.
#[derive(
    Clone, Insertable, Queryable, AsChangeset, Debug, PartialEq, Eq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = frontend_bundle)]
#[diesel(treat_none_as_null = true)]
pub struct FrontendBundleRow {
    pub id: String,
    /// The front end's own version, e.g. "1.2.0". Identity, and the ordering used to
    /// pick the newest bundle. Not comparable with the server's version.
    pub version: String,
    /// The server version this bundle was built against, e.g. "3.2.0" — a value on the
    /// *server's* version line, which is what the compatibility check needs.
    pub server_version: String,
    /// Of the dist zip. Verified after download, before unpacking.
    pub sha256: String,
    /// Withdrawal flag, as on `report`. Central clears it to retire a bundle.
    pub is_active: bool,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

pub struct FrontendBundleRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> FrontendBundleRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        FrontendBundleRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<FrontendBundleRow>, RepositoryError> {
        let result = frontend_bundle::table
            .filter(frontend_bundle::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_version(
        &self,
        version: &str,
    ) -> Result<Option<FrontendBundleRow>, RepositoryError> {
        let result = frontend_bundle::table
            .filter(frontend_bundle::version.eq(version))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<FrontendBundleRow>, RepositoryError> {
        Ok(frontend_bundle::table
            .filter(frontend_bundle::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn all(&self) -> Result<Vec<FrontendBundleRow>, RepositoryError> {
        let result = frontend_bundle::table
            .order_by(frontend_bundle::id)
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// Raw write, no changelog. Sync paths call this and supply their own changelog.
    pub fn _upsert_one(&self, row: &FrontendBundleRow) -> Result<(), RepositoryError> {
        diesel::insert_into(frontend_bundle::table)
            .values(row)
            .on_conflict(frontend_bundle::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &FrontendBundleRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = FrontendBundleRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = FrontendBundleRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(frontend_bundle::table.filter(frontend_bundle::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for FrontendBundleRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        FrontendBundleRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            FrontendBundleRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

/// Bundles are hard deleted: nothing references them apart from their own
/// `sync_file_reference`, and a retired bundle should reclaim its disk.
#[derive(Debug, Clone)]
pub struct FrontendBundleRowDelete(pub String);

impl Delete for FrontendBundleRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                FrontendBundleRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(frontend_bundle::table.filter(frontend_bundle::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            FrontendBundleRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{
        mock::MockDataInserts, test_db::setup_all, ChangelogCondition, ChangelogRepository,
        ChangelogTableName, CursorAndLimit, FilterBuilder,
    };
    use util::uuid::uuid;

    fn test_row() -> FrontendBundleRow {
        FrontendBundleRow {
            id: uuid(),
            version: "1.2.0".to_string(),
            server_version: "3.2.0".to_string(),
            sha256: "abc123".to_string(),
            is_active: true,
            description: Some("test bundle".to_string()),
            created_datetime: chrono::NaiveDate::from_ymd_opt(2026, 8, 3)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap(),
        }
    }

    fn changelogs_for(connection: &StorageConnection, record_id: &str) -> Vec<crate::ChangelogRow> {
        ChangelogRepository::new(connection)
            .query(
                ChangelogCondition::table_name::equal(ChangelogTableName::FrontendBundle),
                CursorAndLimit {
                    cursor: 0,
                    limit: 100,
                },
            )
            .unwrap()
            .rows
            .into_iter()
            .filter(|c| c.record_id == record_id)
            .collect()
    }

    #[actix_rt::test]
    async fn frontend_bundle_upsert_and_delete_round_trip() {
        let (_, connection, _, _) = setup_all(
            "frontend_bundle_upsert_and_delete_round_trip",
            MockDataInserts::none(),
        )
        .await;

        let repo = FrontendBundleRowRepository::new(&connection);
        let row = test_row();

        repo.upsert_one(&row).unwrap();
        assert_eq!(repo.find_one_by_id(&row.id), Ok(Some(row.clone())));
        assert_eq!(repo.find_one_by_version("1.2.0"), Ok(Some(row.clone())));

        // Withdrawal is an ordinary field update, not a delete.
        let withdrawn = FrontendBundleRow {
            is_active: false,
            ..row.clone()
        };
        repo.upsert_one(&withdrawn).unwrap();
        assert_eq!(repo.find_one_by_id(&row.id), Ok(Some(withdrawn)));

        repo.delete(&row.id).unwrap();
        assert_eq!(repo.find_one_by_id(&row.id), Ok(None));
    }

    /// A version identifies at most one bundle. Publishing keys its "already published?"
    /// guard on this, and a bundle unpacks to a directory named after its version, so two
    /// rows sharing one would make the guard ambiguous and collide on disk.
    #[actix_rt::test]
    async fn frontend_bundle_version_is_unique() {
        let (_, connection, _, _) =
            setup_all("frontend_bundle_version_is_unique", MockDataInserts::none()).await;
        let repo = FrontendBundleRowRepository::new(&connection);

        let first = test_row();
        repo.upsert_one(&first).unwrap();

        // A different bundle claiming the same version is refused by the database, not
        // merely avoided by the call sites that happen to check first.
        let duplicate = FrontendBundleRow {
            id: uuid(),
            ..first.clone()
        };
        assert!(
            repo.upsert_one(&duplicate).is_err(),
            "a second bundle with version {} should not be insertable",
            first.version
        );

        // Re-upserting the *same* bundle is still fine — that is the idempotent path
        // publishing and sync integration both rely on.
        repo.upsert_one(&first).unwrap();

        // And the version is reusable once the original is gone.
        repo.delete(&first.id).unwrap();
        repo.upsert_one(&duplicate).unwrap();
        assert_eq!(
            repo.find_one_by_version(&first.version)
                .unwrap()
                .map(|b| b.id),
            Some(duplicate.id)
        );
    }

    #[actix_rt::test]
    async fn frontend_bundle_writes_changelog_on_upsert_and_delete() {
        let (_, connection, _, _) = setup_all(
            "frontend_bundle_writes_changelog_on_upsert_and_delete",
            MockDataInserts::none(),
        )
        .await;

        let repo = FrontendBundleRowRepository::new(&connection);
        let row = test_row();

        repo.upsert_one(&row).unwrap();
        let logs = changelogs_for(&connection, &row.id);
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].table_name, ChangelogTableName::FrontendBundle);
        assert_eq!(logs[0].row_action, RowActionType::Upsert);
        // Central-authored and keyless: a keyless Central-distribution row is what
        // routes the record to every site (see the changelog filter docs).
        assert_eq!(logs[0].store_id, None);
        assert_eq!(logs[0].patient_id, None);

        repo.delete(&row.id).unwrap();
        let logs = changelogs_for(&connection, &row.id);
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[1].row_action, RowActionType::Delete);
    }
}
