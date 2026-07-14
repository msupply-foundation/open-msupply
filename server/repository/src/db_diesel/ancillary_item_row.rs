use crate::{
    diesel_macros::define_linked_tables, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, RepositoryError, RowActionType, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: ancillary_item = "ancillary_item_view",
    core: ancillary_item_with_links = "ancillary_item",
    struct: AncillaryItemRow,
    repo: AncillaryItemRowRepository,
    shared: {
        item_quantity -> Double,
        ancillary_quantity -> Double,
        deleted_datetime -> Nullable<Timestamp>,
    },
    links: {
        item_link_id -> item_id,
        ancillary_item_link_id -> ancillary_item_id,
    },
    optional_links: {}
}

/// Stores an ancillary-item link as the ratio pair the user entered (`item_quantity` :
/// `ancillary_quantity`) rather than a derived decimal, so we don't lose precision through
/// a y/x round-trip. At order time the ancillary count is
/// `requested_quantity * ancillary_quantity / item_quantity`.
#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = ancillary_item)]
pub struct AncillaryItemRow {
    pub id: String,
    pub item_quantity: f64,
    pub ancillary_quantity: f64,
    pub deleted_datetime: Option<NaiveDateTime>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
    pub ancillary_item_id: String,
}

pub struct AncillaryItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AncillaryItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AncillaryItemRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &AncillaryItemRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
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
        diesel::update(
            ancillary_item_with_links::table
                .filter(ancillary_item_with_links::id.eq(ancillary_item_id)),
        )
        .set(ancillary_item_with_links::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
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
