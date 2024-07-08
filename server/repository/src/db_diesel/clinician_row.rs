use super::{name_link_row::name_link, StorageConnection};

use crate::{
    clinician_link, ClinicianLinkRow, ClinicianLinkRowRepository, GenderType, RepositoryError,
    Upsert,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

table! {
  clinician (id) {
    id -> Text,
    code  -> Text,
    last_name -> Text,
    initials -> Text,
    first_name -> Nullable<Text>,
    address1 -> Nullable<Text>,
    address2 -> Nullable<Text>,
    phone -> Nullable<Text>,
    mobile -> Nullable<Text>,
    email -> Nullable<Text>,
    gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
    is_active -> Bool,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = clinician)]
pub struct ClinicianRow {
    pub id: String,
    pub code: String,
    pub last_name: String,
    pub initials: String,
    pub first_name: Option<String>,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub email: Option<String>,
    pub gender: Option<GenderType>,
    pub is_active: bool,
}

table! {
    #[sql_name = "clinician"]
    clinician_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

allow_tables_to_appear_in_same_query!(clinician, clinician_link);
allow_tables_to_appear_in_same_query!(clinician, name_link);

fn insert_or_ignore_clinician_link(
    connection: &StorageConnection,
    row: &ClinicianRow,
) -> Result<(), RepositoryError> {
    let clinician_link_row = ClinicianLinkRow {
        id: row.id.clone(),
        clinician_id: row.id.clone(),
    };

    ClinicianLinkRowRepository::new(connection).insert_one_or_ignore(&clinician_link_row)
}

pub struct ClinicianRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ClinicianRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(clinician::dsl::clinician)
            .values(row)
            .on_conflict(clinician::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_clinician_link(self.connection, row)?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &ClinicianRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Clinician,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id_option(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianRow>, RepositoryError> {
        let result = clinician::dsl::clinician
            .filter(clinician::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(clinician::dsl::clinician.filter(clinician::dsl::id.eq(row_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

pub struct ClinicianRowDelete(pub String);

impl Upsert for ClinicianRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = ClinicianRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ClinicianRowRepository::new(con).find_one_by_id_option(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
