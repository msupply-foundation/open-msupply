use super::{
    ChangelogRepository, RowActionType, StorageConnection,
};

use crate::{
    repository_error::RepositoryError, ChangelogSyncType, SourceSiteId, Upsert,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
  insurance_provider (id) {
      id -> Text,
      provider_name -> Text,
      is_active -> Bool,
      prescription_validity_days -> Nullable<Integer>,
      comment -> Nullable<Text>,
  }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(table_name = insurance_provider)]
pub struct InsuranceProviderRow {
    pub id: String,
    pub provider_name: String,
    pub is_active: bool,
    pub prescription_validity_days: Option<i32>,
    pub comment: Option<String>,
}
pub struct InsuranceProviderRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InsuranceProviderRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InsuranceProviderRowRepository { connection }
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<InsuranceProviderRow>, RepositoryError> {
        let result = insurance_provider::table
            .filter(insurance_provider::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        insurance_provider::table
            .filter(insurance_provider::id.eq_any(ids))
            .load::<InsuranceProviderRow>(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_all(&self) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        let result = insurance_provider::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_all_active(&self) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        let result = insurance_provider::table
            .filter(insurance_provider::is_active.eq(true))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn _upsert_one(&self, row: &InsuranceProviderRow) -> Result<(), RepositoryError> {
        diesel::insert_into(insurance_provider::table)
            .values(row)
            .on_conflict(insurance_provider::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &InsuranceProviderRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = InsuranceProviderRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for InsuranceProviderRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        InsuranceProviderRowRepository::new(con)._upsert_one(self)?;
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
            InsuranceProviderRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
