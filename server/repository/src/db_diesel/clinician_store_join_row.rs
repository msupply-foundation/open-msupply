use super::{clinician_link_row::clinician_link, clinician_row::clinician, StorageConnection};

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
#[table_name = "clinician_store_join"]
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

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .on_conflict(clinician_store_join::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(clinician_store_join::dsl::clinician_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
    pub fn upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(clinician_store_join_is_sync_update::table.find(id))
            .set(clinician_store_join_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn find_one_by_id_option(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianStoreJoinRow>, RepositoryError> {
        let result = clinician_store_join::dsl::clinician_store_join
            .filter(clinician_store_join::dsl::id.eq(row_id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            clinician_store_join::dsl::clinician_store_join
                .filter(clinician_store_join::dsl::id.eq(row_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn sync_upsert_one(&self, row: &ClinicianStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = clinician_store_join_is_sync_update::table
            .find(id)
            .select(clinician_store_join_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

pub struct ClinicianStoreJoinRowDelete(pub String);

impl Upsert for ClinicianStoreJoinRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ClinicianStoreJoinRowRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ClinicianStoreJoinRowRepository::new(con).find_one_by_id_option(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{
        mock::{mock_store_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ClinicianRow, ClinicianStoreJoinRow, ClinicianStoreJoinRowRepository,
    };

    #[actix_rt::test]
    async fn clinician_store_join_is_sync_update() {
        let clinician = ClinicianRow {
            id: uuid(),
            ..Default::default()
        };

        let (_, connection, _, _) = setup_all_with_data(
            "clinician_store_join_is_sync_update",
            MockDataInserts::none()
                .items()
                .units()
                .names()
                .stores()
                .clinicians(),
            MockData {
                clinicians: vec![clinician.clone()],
                ..Default::default()
            },
        )
        .await;

        let repo = ClinicianStoreJoinRowRepository::new(&connection);

        let base_row = ClinicianStoreJoinRow {
            clinician_link_id: clinician.id,
            store_id: mock_store_a().id,
            ..Default::default()
        };

        // Two rows, to make sure is_sync_update update only affects one row
        let row = ClinicianStoreJoinRow {
            id: uuid(),
            ..base_row.clone()
        };
        let row2 = ClinicianStoreJoinRow {
            id: uuid(),
            ..base_row.clone()
        };

        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
