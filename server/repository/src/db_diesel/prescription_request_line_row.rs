use super::{
    item_link_row::item_link, item_row::item, prescription_request_row::prescription_request,
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
    view: prescription_request_line = "prescription_request_line_view",
    core: prescription_request_line_with_links = "prescription_request_line",
    struct: PrescriptionRequestLineRow,
    repo: PrescriptionRequestLineRowRepository,
    shared: {
        prescription_request_id -> Text,
        number_of_units -> Double,
        note -> Nullable<Text>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(prescription_request_line -> prescription_request (prescription_request_id));
joinable!(prescription_request_line -> item (item_id));

allow_tables_to_appear_in_same_query!(prescription_request_line, prescription_request);
allow_tables_to_appear_in_same_query!(prescription_request_line, item);
allow_tables_to_appear_in_same_query!(prescription_request_line, item_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = prescription_request_line)]
pub struct PrescriptionRequestLineRow {
    pub id: String,
    pub prescription_request_id: String,
    /// Prescribed quantity, in units (never packs — the prescriber does not
    /// know the pack size); copied to the dispensing invoice line's
    /// prescribed_quantity when the request converts.
    pub number_of_units: f64,
    /// Directions text (abbreviations already expanded); copied to the
    /// dispensing invoice line's note on conversion.
    pub note: Option<String>,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct PrescriptionRequestLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionRequestLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionRequestLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PrescriptionRequestLineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = PrescriptionRequestLineRow::generate_changelog(
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
            prescription_request_line_with_links::table
                .filter(prescription_request_line_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = match PrescriptionRequestLineRow::generate_changelog(
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
    ) -> Result<Option<PrescriptionRequestLineRow>, RepositoryError> {
        let result = prescription_request_line::table
            .filter(prescription_request_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PrescriptionRequestLineRow>, RepositoryError> {
        let result = prescription_request_line::table
            .filter(prescription_request_line::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_prescription_request_id(
        &self,
        prescription_request_id: &str,
    ) -> Result<Vec<PrescriptionRequestLineRow>, RepositoryError> {
        let result = prescription_request_line::table
            .filter(prescription_request_line::prescription_request_id.eq(prescription_request_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_prescription_request_ids(
        &self,
        prescription_request_ids: &[String],
    ) -> Result<Vec<PrescriptionRequestLineRow>, RepositoryError> {
        let result = prescription_request_line::table
            .filter(
                prescription_request_line::prescription_request_id.eq_any(prescription_request_ids),
            )
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct PrescriptionRequestLineRowDelete(pub String);
impl Delete for PrescriptionRequestLineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionRequestLineRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        PrescriptionRequestLineRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PrescriptionRequestLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for PrescriptionRequestLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PrescriptionRequestLineRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionRequestLineRow::generate_changelog(
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
            PrescriptionRequestLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
