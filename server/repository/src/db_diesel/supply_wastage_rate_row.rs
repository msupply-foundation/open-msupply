use crate::{
    ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert, diesel_macros::define_linked_tables,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: supply_wastage_rate = "supply_wastage_rate_view",
    core: supply_wastage_rate_with_links = "supply_wastage_rate",
    struct: SupplyWastageRateRow,
    repo: SupplyWastageRateRowRepository,
    shared: {
        wastage_rate -> Double,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {}
}

/// A supply's own wastage rate (%), applied on top of what it is ordered against through
/// its ancillary links, e.g. AD syringes broken or dropped. One per item, keyed by the item
/// id when created, and authored on central; a rate of 0 means none.
#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = supply_wastage_rate)]
pub struct SupplyWastageRateRow {
    pub id: String,
    pub wastage_rate: f64,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct SupplyWastageRateRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SupplyWastageRateRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SupplyWastageRateRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &SupplyWastageRateRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = SupplyWastageRateRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<SupplyWastageRateRow>, RepositoryError> {
        Ok(supply_wastage_rate::table
            .filter(supply_wastage_rate::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<SupplyWastageRateRow>, RepositoryError> {
        let result = supply_wastage_rate::table
            .filter(supply_wastage_rate::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// Rows for the given items. After an item merge one item can have more than one.
    pub fn find_many_by_item_id(
        &self,
        item_ids: &[String],
    ) -> Result<Vec<SupplyWastageRateRow>, RepositoryError> {
        Ok(supply_wastage_rate::table
            .filter(supply_wastage_rate::item_id.eq_any(item_ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for SupplyWastageRateRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SupplyWastageRateRowRepository::new(con)._upsert(self)?;

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
            SupplyWastageRateRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
