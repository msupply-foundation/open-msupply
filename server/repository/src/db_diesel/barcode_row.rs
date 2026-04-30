use crate::SourceSiteIdForChangelog;
use crate::{ChangelogSyncType, Upsert};

use super::{
    invoice_line_row::invoice_line, item_link_row::item_link, item_row::item,
    name_link_row::name_link, RepositoryError, StorageConnection,
};
use crate::diesel_macros::define_linked_tables;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
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

impl BarcodeRow {
    pub(crate) fn changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteIdForChangelog,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Barcode,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        let changelog = BarcodeRow::changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteIdForChangelog::CurrentSiteId,
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
}

impl Upsert for BarcodeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        BarcodeRowRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteIdForChangelog::SourceSiteId(source_site_id),
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
