use super::{
    clinician_link_row::clinician_link, clinician_row::clinician, custom_fields_json::JsonValue,
    diagnosis_row::diagnosis, name_row::name, program_row::program, store_row::store,
    StorageConnection,
};

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::define_linked_tables;
use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangelogRepository, ChangelogSyncType, RowActionType, SourceSiteId};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: prescription_order = "prescription_order_view",
    core: prescription_order_with_links = "prescription_order",
    struct: PrescriptionOrderRow,
    repo: PrescriptionOrderRowRepository,
    shared: {
        store_id -> Text,
        prescription_order_number -> BigInt,
        status -> crate::db_diesel::prescription_order_row::PrescriptionOrderStatusMapping,
        clinician_link_id -> Nullable<Text>,
        diagnosis_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        created_datetime -> Timestamp,
        prescription_datetime -> Timestamp,
        ready_datetime -> Nullable<Timestamp>,
        dispensed_datetime -> Nullable<Timestamp>,
        created_by -> Text,
        comment -> Nullable<Text>,
        custom_fields -> Nullable<crate::db_diesel::custom_fields_json::CustomFieldsJson>,
    },
    links: {
        patient_link_id -> patient_id,
    },
    optional_links: {
    }
}

joinable!(prescription_order -> store (store_id));
joinable!(prescription_order -> clinician_link (clinician_link_id));
joinable!(prescription_order -> diagnosis (diagnosis_id));
joinable!(prescription_order -> program (program_id));
joinable!(prescription_order -> name (patient_id));

allow_tables_to_appear_in_same_query!(prescription_order, name);
allow_tables_to_appear_in_same_query!(prescription_order, clinician_link);
allow_tables_to_appear_in_same_query!(prescription_order, clinician);
allow_tables_to_appear_in_same_query!(prescription_order, diagnosis);
allow_tables_to_appear_in_same_query!(prescription_order, program);
allow_tables_to_appear_in_same_query!(prescription_order, store);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PrescriptionOrderStatus {
    #[default]
    New,
    ReadyToDispense,
    Dispensed,
}

impl PrescriptionOrderStatus {
    pub fn index(&self) -> u8 {
        match self {
            PrescriptionOrderStatus::New => 1,
            PrescriptionOrderStatus::ReadyToDispense => 2,
            PrescriptionOrderStatus::Dispensed => 3,
        }
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
#[diesel(table_name = prescription_order)]
pub struct PrescriptionOrderRow {
    pub id: String,
    pub store_id: String,
    pub prescription_order_number: i64,
    pub status: PrescriptionOrderStatus,
    pub clinician_link_id: Option<String>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub created_datetime: NaiveDateTime,
    /// The prescriber-facing prescription date; defaults to now but is editable
    /// (mirrors the dispensing invoice's backdated_datetime behaviour).
    pub prescription_datetime: NaiveDateTime,
    pub ready_datetime: Option<NaiveDateTime>,
    pub dispensed_datetime: Option<NaiveDateTime>,
    pub created_by: String,
    pub comment: Option<String>,
    /// Properties-v2 values keyed by `custom_field.key` (weight, patient unit,
    /// category, occupation, ... per deployment config).
    pub custom_fields: Option<JsonValue>,
    // Resolved from name_link - must be last to match view column order
    pub patient_id: String,
}

pub struct PrescriptionOrderRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionOrderRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionOrderRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PrescriptionOrderRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = PrescriptionOrderRow::generate_changelog(
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
            prescription_order_with_links::table.filter(prescription_order_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = match PrescriptionOrderRow::generate_changelog(
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
    ) -> Result<Option<PrescriptionOrderRow>, RepositoryError> {
        let result = prescription_order::table
            .filter(prescription_order::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PrescriptionOrderRow>, RepositoryError> {
        let result = prescription_order::table
            .filter(prescription_order::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct PrescriptionOrderRowDelete(pub String);
impl Delete for PrescriptionOrderRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionOrderRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        PrescriptionOrderRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PrescriptionOrderRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for PrescriptionOrderRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PrescriptionOrderRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PrescriptionOrderRow::generate_changelog(
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
            PrescriptionOrderRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
