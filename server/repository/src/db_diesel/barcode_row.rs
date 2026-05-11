use crate::SourceSiteId;
use crate::{ChangelogSyncType, Upsert};

use super::{
    invoice_line_row::invoice_line, item_link_row::item_link, item_row::item,
    name_link_row::name_link, RepositoryError, StorageConnection,
};
use crate::diesel_macros::define_linked_tables;
use crate::{ChangelogRepository, RowActionType};

use diesel::prelude::*;

define_linked_tables! {
    view: barcode = "barcode_view",
    core: barcode_with_links = "barcode",
    struct: BarcodeRow,
    repo: BarcodeRowRepository,
    shared: {
        gtin -> Text,
        item_id -> Text,
        pack_size -> Nullable<Double>,
        parent_id -> Nullable<Text>,
    },
    links: {},
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

use crate::db_diesel::name_row::name;

joinable!(barcode -> item (item_id));
joinable!(barcode -> invoice_line (id));
joinable!(barcode -> name (manufacturer_id));
joinable!(barcode_with_links -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(barcode, item_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = barcode)]
pub struct BarcodeRow {
    pub id: String,
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub parent_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub manufacturer_id: Option<String>,
}
pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = BarcodeRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BarcodeRow>, RepositoryError> {
        let result = barcode::table
            .filter(barcode::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_item_id(&self, item_id: &str) -> Result<Vec<BarcodeRow>, RepositoryError> {
        let result = barcode::table
            .filter(barcode::item_id.eq(item_id))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<BarcodeRow>, RepositoryError> {
        Ok(barcode::table
            .filter(barcode::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for BarcodeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        BarcodeRowRepository::new(con)._upsert(self)?;
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
            BarcodeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
