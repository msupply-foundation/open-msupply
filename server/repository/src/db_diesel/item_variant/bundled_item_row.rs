use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    bundled_item(id) {
        id -> Text,
        principal_item_variant_id -> Text,
        bundled_item_variant_id -> Text,
        ratio -> Double,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = bundled_item)]
pub struct BundledItemRow {
    pub id: String,
    pub principal_item_variant_id: String,
    pub bundled_item_variant_id: String,
    pub ratio: f64,
    pub deleted_datetime: Option<NaiveDateTime>,
}
pub struct BundledItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BundledItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BundledItemRowRepository { connection }
    }

    fn _upsert_one(&self, row: &BundledItemRow) -> Result<(), RepositoryError> {
        diesel::insert_into(bundled_item::table)
            .values(row)
            .on_conflict(bundled_item::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &BundledItemRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = BundledItemRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        bundled_item_id: &str,
    ) -> Result<Option<BundledItemRow>, RepositoryError> {
        let result = bundled_item::table
            .filter(bundled_item::id.eq(bundled_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, bundled_item_id: &str) -> Result<(), RepositoryError> {
        diesel::update(bundled_item::table.filter(bundled_item::id.eq(bundled_item_id)))
            .set(bundled_item::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = BundledItemRow::generate_changelog(
            bundled_item_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<BundledItemRow>, RepositoryError> {
        Ok(bundled_item::table
            .filter(bundled_item::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for BundledItemRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        BundledItemRowRepository::new(con)._upsert_one(self)?;

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
            BundledItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
