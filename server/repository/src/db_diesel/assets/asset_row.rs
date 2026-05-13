use super::asset_row::asset::dsl::*;
use crate::asset_log_row::latest_asset_log;
use crate::db_diesel::store_row::store;
use crate::{
    ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    asset (id) {
        id -> Text,
        notes -> Nullable<Text>,
        asset_number -> Nullable<Text>,
        asset_category_id -> Nullable<Text>,
        asset_class_id -> Nullable<Text>,
        asset_catalogue_type_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        serial_number -> Nullable<Text>,
        asset_catalogue_item_id -> Nullable<Text>,
        installation_date -> Nullable<Date>,
        replacement_date -> Nullable<Date>,
        created_datetime -> Timestamp,
        modified_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
        properties -> Nullable<Text>,
        donor_name_id -> Nullable<Text>,
        warranty_start -> Nullable<Date>,
        warranty_end -> Nullable<Date>,
        needs_replacement -> Nullable<Bool>,
        locked_fields_json -> Nullable<Text>,
    }
}

joinable!(asset -> store (store_id));
allow_tables_to_appear_in_same_query!(latest_asset_log, asset, store);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = asset)]
pub struct AssetRow {
    pub id: String,
    pub notes: Option<String>,
    pub asset_number: Option<String>,
    pub asset_category_id: Option<String>,
    pub asset_class_id: Option<String>,
    #[diesel(column_name = "asset_catalogue_type_id")]
    pub asset_type_id: Option<String>,
    pub store_id: Option<String>,
    pub serial_number: Option<String>,
    #[diesel(column_name = "asset_catalogue_item_id")]
    pub catalogue_item_id: Option<String>,
    pub installation_date: Option<NaiveDate>,
    pub replacement_date: Option<NaiveDate>,
    pub created_datetime: NaiveDateTime,
    pub modified_datetime: NaiveDateTime,
    pub deleted_datetime: Option<NaiveDateTime>,
    pub properties: Option<String>,
    pub donor_name_id: Option<String>,
    pub warranty_start: Option<NaiveDate>,
    pub warranty_end: Option<NaiveDate>,
    pub needs_replacement: Option<bool>,
    pub locked_fields_json: Option<String>,
}

pub struct AssetRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetRowRepository { connection }
    }

    pub fn _upsert_one(&self, asset_row: &AssetRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset)
            .values(asset_row)
            .on_conflict(id)
            .do_update()
            .set(asset_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_row: &AssetRow,
        original_store_id: Option<String>,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_row)?;
        let changelog = asset_row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        if let Some(original_store) = original_store_id {
            // Insert upsert changelog for original store
            // if store is on different site it should be synced there
            // with new store_id, making it invisible in that store
            let mut original_changelog = asset_row.generate_changelog(
                self.connection,
                RowActionType::Upsert,
                SourceSiteId::CurrentSiteId,
            )?;
            original_changelog.store_id = Some(original_store);
            ChangelogRepository::new(self.connection).insert(&original_changelog)?;
        }
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetRow>, RepositoryError> {
        let result = asset
            .filter(deleted_datetime.is_null())
            .load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(&self, asset_id: &str) -> Result<Option<AssetRow>, RepositoryError> {
        let result = asset
            .filter(id.eq(asset_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn _mark_deleted(&self, asset_id_param: &str) -> Result<(), RepositoryError> {
        diesel::update(asset.filter(id.eq(asset_id_param)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn mark_deleted(&self, asset_id_param: &str) -> Result<(), RepositoryError> {
        let row = self
            .find_one_by_id(asset_id_param)?
            .ok_or(RepositoryError::NotFound)?;
        self._mark_deleted(asset_id_param)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetRow>, RepositoryError> {
        Ok(asset::table
            .filter(asset::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for AssetRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
            AssetRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct AssetRowDelete(pub String);
impl Upsert for AssetRowDelete {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = AssetRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                let row = repo
                    .find_one_by_id(&self.0)?
                    .ok_or(RepositoryError::NotFound)?;
                row.generate_changelog(
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._mark_deleted(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert!(matches!(
            AssetRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(AssetRow {
                deleted_datetime: Some(_),
                ..
            })) | Ok(None)
        ));
    }
}
