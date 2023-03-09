use super::{clinician_row::clinician, StorageConnection};

use crate::RepositoryError;

use diesel::prelude::*;

table! {
  clinician_store_join (id) {
    id -> Text,
    store_id -> Text,
    clinician_id -> Text,
    is_sync_update -> Bool,
  }
}

joinable!(clinician_store_join -> clinician (clinician_id));
allow_tables_to_appear_in_same_query!(clinician, clinician_store_join);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "clinician_store_join"]
pub struct ClinicianStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub clinician_id: String,
    pub is_sync_update: bool,
}

pub struct ClinicianStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianStoreJoinRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .on_conflict(clinician_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianStoreJoinRow>, RepositoryError> {
        let result = clinician_store_join::dsl::clinician_store_join
            .filter(clinician_store_join::dsl::id.eq(row_id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            clinician_store_join::dsl::clinician_store_join
                .filter(clinician_store_join::dsl::id.eq(row_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}
