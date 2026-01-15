use crate::{
    db_diesel::{
        barcode_row::barcode, item_row::item, location_row::location,
        location_type_row::location_type, name_link_row::name_link, name_row::name,
    },
    diesel_macros::define_linked_tables,
    item_link, user_account, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RepositoryError, RowActionType, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: item_variant = "item_variant_view",
    core: item_variant_with_links = "item_variant",
    struct: ItemVariantRow,
    repo: ItemVariantRowRepository,
    shared: {
        name -> Text,
        item_link_id -> Text,
        location_type_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
        vvm_type -> Nullable<Text>,
        created_datetime -> Timestamp,
        created_by -> Nullable<Text>,
    },
    links: {},
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

joinable!(item_variant -> item_link (item_link_id));
joinable!(item_variant -> location_type (location_type_id));
joinable!(item_variant -> name (manufacturer_id));
joinable!(item_variant_with_links -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(item_variant, item_link);
allow_tables_to_appear_in_same_query!(item_variant, item);
allow_tables_to_appear_in_same_query!(item_variant, user_account);
allow_tables_to_appear_in_same_query!(item_variant, name_link);
allow_tables_to_appear_in_same_query!(item_variant, name);
allow_tables_to_appear_in_same_query!(item_variant, location_type);
allow_tables_to_appear_in_same_query!(item_variant, barcode);
allow_tables_to_appear_in_same_query!(item_variant, location);
allow_tables_to_appear_in_same_query!(item_variant_with_links, name_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = item_variant)]
pub struct ItemVariantRow {
    pub id: String,
    pub name: String,
    pub item_link_id: String,
    #[serde(rename = "cold_storage_type_id")] // To prevent breaking change in v6 sync API
    pub location_type_id: Option<String>,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
    pub vvm_type: Option<String>,
    pub created_datetime: NaiveDateTime,
    #[serde(default)]
    pub created_by: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub manufacturer_id: Option<String>,
}

pub struct ItemVariantRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemVariantRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemVariantRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemVariantRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
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
        diesel::update(item_variant_with_links::table.filter(item_variant_with_links::id.eq(item_variant_id)))
            .set(item_variant_with_links::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        self.insert_changelog(item_variant_id.to_string(), RowActionType::Upsert)
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
