use crate::{
    diesel_macros::define_linked_tables, ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
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

    pub fn upsert_one(&self, row: &AncillaryItemRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = AncillaryItemRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AncillaryItemRow>, RepositoryError> {
        Ok(ancillary_item::table
            .filter(ancillary_item::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
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

    pub fn mark_deleted(&self, ancillary_item_id: &str) -> Result<(), RepositoryError> {
        diesel::update(
            ancillary_item_with_links::table
                .filter(ancillary_item_with_links::id.eq(ancillary_item_id)),
        )
        .set(ancillary_item_with_links::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
        .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = AncillaryItemRow::generate_changelog(
            ancillary_item_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for AncillaryItemRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AncillaryItemRowRepository::new(con)._upsert(self)?;

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
            AncillaryItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
