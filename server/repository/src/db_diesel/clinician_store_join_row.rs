use super::{clinician_link_row::clinician_link, clinician_row::clinician, StorageConnection};

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{RepositoryError, Upsert};

use diesel::prelude::*;

table! {
  clinician_store_join (id) {
    id -> Text,
    store_id -> Text,
    clinician_link_id -> Text,
  }
}

table! {
    #[sql_name = "clinician_store_join"]
    clinician_store_join_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(clinician_store_join -> clinician_link (clinician_link_id));
allow_tables_to_appear_in_same_query!(clinician, clinician_store_join);
allow_tables_to_appear_in_same_query!(clinician_store_join, clinician_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = clinician_store_join)]
pub struct ClinicianStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub clinician_link_id: String,
}

pub struct ClinicianStoreJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianStoreJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianStoreJoinRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .on_conflict(clinician_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &ClinicianStoreJoinRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ClinicianStoreJoin,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianStoreJoinRow>, RepositoryError> {
        let result = clinician_store_join::dsl::clinician_store_join
            .filter(clinician_store_join::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            clinician_store_join::dsl::clinician_store_join
                .filter(clinician_store_join::dsl::id.eq(row_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ClinicianStoreJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = ClinicianStoreJoinRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ClinicianStoreJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
