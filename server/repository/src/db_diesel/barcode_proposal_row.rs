use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::define_linked_tables;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};

use super::{item_link_row::item_link, item_row::item, name_link_row::name_link, store_row::store};

use chrono::NaiveDateTime;
use diesel::prelude::*;

// A barcode a store has learned: a user picked this item for this barcode. Authored
// by the store's own site and synced up to central, where it's reviewed; it isn't
// sent to other sites. One row per store, barcode and item: proposing the same thing
// again updates the row. A store withdrawing its proposal deletes the row; the
// delete syncs up too. See decisions/2026-09-30_barcodes.md.
define_linked_tables! {
    view: barcode_proposal = "barcode_proposal_view",
    core: barcode_proposal_with_links = "barcode_proposal",
    struct: BarcodeProposalRow,
    repo: BarcodeProposalRowRepository,
    shared: {
        value -> Text,
        pack_size -> Nullable<Double>,
        store_id -> Text,
        user_id -> Text,
        created_datetime -> Timestamp,
        updated_datetime -> Timestamp,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

joinable!(barcode_proposal -> item (item_id));
joinable!(barcode_proposal -> store (store_id));
joinable!(barcode_proposal_with_links -> item_link (item_link_id));
joinable!(barcode_proposal_with_links -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(barcode_proposal, item);
allow_tables_to_appear_in_same_query!(barcode_proposal, store);

#[derive(Clone, Queryable, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = barcode_proposal)]
pub struct BarcodeProposalRow {
    pub id: String,
    /// The barcode in its standard form with its scheme, as `BarcodeRow::value`
    pub value: String,
    pub pack_size: Option<f64>,
    pub store_id: String,
    pub user_id: String,
    pub created_datetime: NaiveDateTime,
    pub updated_datetime: NaiveDateTime,
    // Resolved from link tables - must be last to match view column order
    pub item_id: String,
    pub manufacturer_id: Option<String>,
}

pub struct BarcodeProposalRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeProposalRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeProposalRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &BarcodeProposalRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = BarcodeProposalRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    /// Withdraws the proposal. Nothing about it needs remembering, so the row goes.
    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        // Before the delete: the changelog reads the row for its store
        let changelog = BarcodeProposalRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(
            barcode_proposal_with_links::table.filter(barcode_proposal_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BarcodeProposalRow>, RepositoryError> {
        let result = barcode_proposal::table
            .filter(barcode_proposal::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// This store's proposal of this barcode for this item, if it made one
    pub fn find_one_by_store_value_and_item(
        &self,
        store_id: &str,
        value: &str,
        item_id: &str,
    ) -> Result<Option<BarcodeProposalRow>, RepositoryError> {
        let result = barcode_proposal::table
            .filter(barcode_proposal::store_id.eq(store_id))
            .filter(barcode_proposal::value.eq(value))
            .filter(barcode_proposal::item_id.eq(item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<BarcodeProposalRow>, RepositoryError> {
        Ok(barcode_proposal::table
            .filter(barcode_proposal::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

#[derive(Debug, Clone)]
pub struct BarcodeProposalRowDelete(pub String);
impl Delete for BarcodeProposalRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                BarcodeProposalRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        diesel::delete(
            barcode_proposal_with_links::table.filter(barcode_proposal_with_links::id.eq(&self.0)),
        )
        .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            BarcodeProposalRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for BarcodeProposalRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        BarcodeProposalRowRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                RowOrId::Row(self),
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
            BarcodeProposalRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
