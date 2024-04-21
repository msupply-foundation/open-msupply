use super::asset_row::asset::dsl::*;

use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogAction;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use chrono::NaiveDate;
use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    asset (id) {
        id -> Text,
        notes -> Nullable<Text>,
        asset_number -> Nullable<Text>,
        asset_category_id -> Nullable<Text>,
        asset_class_id -> Nullable<Text>,
        asset_type_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        serial_number -> Nullable<Text>,
        asset_catalogue_item_id -> Nullable<Text>,
        installation_date -> Nullable<Date>,
        replacement_date -> Nullable<Date>,
        created_datetime -> Timestamp,
        modified_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

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
}

pub struct AssetRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, asset_row: &AssetRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset)
            .values(asset_row)
            .on_conflict(id)
            .do_update()
            .set(asset_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, asset_row: &AssetRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset)
            .values(asset_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, asset_row: &AssetRow) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_row)?;
        self.insert_changelog(
            asset_row.id.to_owned(),
            ChangelogAction::Upsert,
            Some(asset_row.clone()),
        )
    }

    fn insert_changelog(
        &self,
        asset_id: String,
        action: ChangelogAction,
        row: Option<AssetRow>,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Asset,
            record_id: asset_id,
            row_action: action,
            store_id: row.map(|r| r.store_id).unwrap_or(None),
            ..Default::default()
        };
        ChangelogRepository::new(&self.connection).insert(&row)
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

    pub fn delete(&self, asset_id: &str) -> Result<(), RepositoryError> {
        diesel::update(asset.filter(id.eq(asset_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        _ = self.insert_changelog(asset_id.to_owned(), ChangelogAction::Delete, None); // TODO: return this and enable delete sync...
        Ok(())
    }
}

impl Upsert for AssetRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = AssetRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = AssetRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
