use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
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

    pub fn upsert_one(&self, row: &BundledItemRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(bundled_item::table)
            .values(row)
            .on_conflict(bundled_item::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::BundledItem,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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

    pub fn mark_deleted(&self, bundled_item_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(bundled_item::table.filter(bundled_item::id.eq(bundled_item_id)))
            .set(bundled_item::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        self.insert_changelog(bundled_item_id.to_owned(), RowActionType::Upsert)
    }
}

impl Upsert for BundledItemRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = BundledItemRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            BundledItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
