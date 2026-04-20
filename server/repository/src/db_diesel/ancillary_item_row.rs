use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    ancillary_item(id) {
        id -> Text,
        item_link_id -> Text,
        ancillary_item_link_id -> Text,
        item_quantity -> Double,
        ancillary_quantity -> Double,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

/// Stores an ancillary-item link as the ratio pair the user entered (`item_quantity` :
/// `ancillary_quantity`) rather than a derived decimal, so we don't lose precision through
/// a y/x round-trip. At order time the ancillary count is
/// `requested_quantity * ancillary_quantity / item_quantity`.
#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = ancillary_item)]
pub struct AncillaryItemRow {
    pub id: String,
    pub item_link_id: String,
    pub ancillary_item_link_id: String,
    pub item_quantity: f64,
    pub ancillary_quantity: f64,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct AncillaryItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AncillaryItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AncillaryItemRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &AncillaryItemRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(ancillary_item::table)
            .values(row)
            .on_conflict(ancillary_item::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AncillaryItem,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        ancillary_item_id: &str,
    ) -> Result<Option<AncillaryItemRow>, RepositoryError> {
        let result = ancillary_item::table
            .filter(ancillary_item::id.eq(ancillary_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, ancillary_item_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(ancillary_item::table.filter(ancillary_item::id.eq(ancillary_item_id)))
            .set(ancillary_item::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        self.insert_changelog(ancillary_item_id.to_string(), RowActionType::Upsert)
    }
}

impl Upsert for AncillaryItemRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = AncillaryItemRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AncillaryItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
