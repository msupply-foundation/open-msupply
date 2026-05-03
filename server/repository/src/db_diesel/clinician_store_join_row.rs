use super::{clinician_link_row::clinician_link, clinician_row::clinician, StorageConnection};

use crate::{ChangelogRepository, Delete, RowActionType};
use crate::{ChangelogSyncType, RepositoryError, SourceSiteId, Upsert};

use diesel::prelude::*;

table! {
  clinician_store_join (id) {
    id -> Text,
    store_id -> Text,
    clinician_link_id -> Text,
  }
}

joinable!(clinician_store_join -> clinician_link (clinician_link_id));
allow_tables_to_appear_in_same_query!(clinician, clinician_store_join);
allow_tables_to_appear_in_same_query!(clinician_store_join, clinician_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = clinician_store_join)]
pub struct ClinicianStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub clinician_link_id: String,
}
pub struct ClinicianStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianStoreJoinRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .on_conflict(clinician_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ClinicianStoreJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianStoreJoinRow>, RepositoryError> {
        let result = clinician_store_join::dsl::clinician_store_join
            .filter(clinician_store_join::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            clinician_store_join::dsl::clinician_store_join
                .filter(clinician_store_join::dsl::id.eq(row_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ClinicianStoreJoinRow>, RepositoryError> {
        Ok(clinician_store_join::table
            .filter(clinician_store_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ClinicianStoreJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ClinicianStoreJoinRowRepository::new(con)._upsert_one(self)?;
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
            ClinicianStoreJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct ClinicianStoreJoinRowDelete(pub String);
impl Delete for ClinicianStoreJoinRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        _sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ClinicianStoreJoinRowRepository::new(con).delete(&self.0)?;
        Ok(()) // Clinician store joins not in Changelog/not synced out
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            ClinicianStoreJoinRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        ));
    }
}
