use super::{
    item_link_row::item_link, item_row::item, prescription_order_row::prescription_order,
    StorageConnection,
};

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::define_linked_tables;
use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangelogRepository, ChangelogSyncType, RowActionType, SourceSiteId};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: prescription_order_line = "prescription_order_line_view",
    core: prescription_order_line_with_links = "prescription_order_line",
    struct: PrescriptionOrderLineRow,
    repo: PrescriptionOrderLineRowRepository,
    shared: {
        prescription_order_id -> Text,
        quantity -> Double,
        note -> Nullable<Text>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(prescription_order_line -> prescription_order (prescription_order_id));
joinable!(prescription_order_line -> item (item_id));

allow_tables_to_appear_in_same_query!(prescription_order_line, prescription_order);
allow_tables_to_appear_in_same_query!(prescription_order_line, item);
allow_tables_to_appear_in_same_query!(prescription_order_line, item_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = prescription_order_line)]
pub struct PrescriptionOrderLineRow {
    pub id: String,
    pub prescription_order_id: String,
    /// Prescribed quantity in units; copied to the dispensing invoice line's
    /// prescribed_quantity when the order converts.
    pub quantity: f64,
    /// Directions text (abbreviations already expanded); copied to the
    /// dispensing invoice line's note on conversion.
    pub note: Option<String>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct PrescriptionOrderLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionOrderLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionOrderLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PrescriptionOrderLineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = PrescriptionOrderLineRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            prescription_order_line_with_links::table
                .filter(prescription_order_line_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = match PrescriptionOrderLineRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        ) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => return Ok(()),
            Err(e) => return Err(e),
        };
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        self._delete(id)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<PrescriptionOrderLineRow>, RepositoryError> {
        let result = prescription_order_line::table
            .filter(prescription_order_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PrescriptionOrderLineRow>, RepositoryError> {
        let result = prescription_order_line::table
            .filter(prescription_order_line::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_prescription_order_id(
        &self,
        prescription_order_id: &str,
    ) -> Result<Vec<PrescriptionOrderLineRow>, RepositoryError> {
        let result = prescription_order_line::table
            .filter(prescription_order_line::prescription_order_id.eq(prescription_order_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_prescription_order_ids(
        &self,
        prescription_order_ids: &[String],
    ) -> Result<Vec<PrescriptionOrderLineRow>, RepositoryError> {
        let result = prescription_order_line::table
            .filter(prescription_order_line::prescription_order_id.eq_any(prescription_order_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct PrescriptionOrderLineRowDelete(pub String);
impl Delete for PrescriptionOrderLineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionOrderLineRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        PrescriptionOrderLineRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PrescriptionOrderLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for PrescriptionOrderLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PrescriptionOrderLineRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionOrderLineRow::generate_changelog(
                    RowOrId::Row(self),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PrescriptionOrderLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
