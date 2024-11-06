use crate::{
    db_diesel::item_row::item, item_link, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, RepositoryError, RowActionType, StorageConnection, Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    item_variant(id) {
        id -> Text,
        name -> Text,
        item_link_id -> Text,
        cold_storage_type_id -> Nullable<Text>,
        doses_per_unit -> Nullable<Integer>,
        manufacturer_link_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

joinable!(item_variant -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_variant, item_link);
allow_tables_to_appear_in_same_query!(item_variant, item);

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = item_variant)]
pub struct ItemVariantRow {
    pub id: String,
    pub name: String,
    pub item_link_id: String,
    pub cold_storage_type_id: Option<String>,
    pub doses_per_unit: Option<i32>,
    pub manufacturer_link_id: Option<String>,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
}

pub struct ItemVariantRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemVariantRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemVariantRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemVariantRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(item_variant::table)
            .values(row)
            .on_conflict(item_variant::id)
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
            table_name: ChangelogTableName::ItemVariant,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        item_variant_id: &str,
    ) -> Result<Option<ItemVariantRow>, RepositoryError> {
        let result = item_variant::table
            .filter(item_variant::id.eq(item_variant_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name(
        &self,
        item_variant_name: &str,
    ) -> Result<Option<ItemVariantRow>, RepositoryError> {
        let result = item_variant::table
            .filter(item_variant::name.eq(item_variant_name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, item_variant_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(item_variant::table.filter(item_variant::id.eq(item_variant_id)))
            .set(item_variant::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        self.insert_changelog(item_variant_id.to_owned(), RowActionType::Upsert)
    }
}

impl Upsert for ItemVariantRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = ItemVariantRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemVariantRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
