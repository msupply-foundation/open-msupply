use super::{name_link_row::name_link, StorageConnection};

use crate::{
    clinician_link, ClinicianLinkRow, ClinicianLinkRowRepository, Gender, RepositoryError, Upsert,
};

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
    gender -> Nullable<crate::db_diesel::name_row::GenderMapping>,
    is_active -> Bool,
  }

}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[table_name = "clinician"]
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
    pub gender: Option<Gender>,
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

fn insert_or_ignore_clinician_link<'a>(
    connection: &StorageConnection,
    row: &ClinicianRow,
) -> Result<(), RepositoryError> {
    let clinician_link_row = ClinicianLinkRow {
        id: row.id.clone(),
        clinician_id: row.id.clone(),
    };

    ClinicianLinkRowRepository::new(connection).insert_one_or_ignore(&clinician_link_row)?;

    Ok(())
}

pub struct ClinicianRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician::dsl::clinician)
            .values(row)
            .on_conflict(clinician::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        diesel::replace_into(clinician::dsl::clinician)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        insert_or_ignore_clinician_link(&self.connection, &row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(clinician_is_sync_update::table.find(id))
            .set(clinician_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn find_one_by_id_option(
        &self,
        row_id: &str,
    ) -> Result<Option<ClinicianRow>, RepositoryError> {
        let result = clinician::dsl::clinician
            .filter(clinician::dsl::id.eq(row_id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(clinician::dsl::clinician.filter(clinician::dsl::id.eq(row_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn sync_upsert_one(&self, row: &ClinicianRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        insert_or_ignore_clinician_link(&self.connection, &row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = clinician_is_sync_update::table
            .find(id)
            .select(clinician_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

pub struct ClinicianRowDelete(pub String);

impl Upsert for ClinicianRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ClinicianRowRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ClinicianRowRepository::new(con).find_one_by_id_option(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{mock::MockDataInserts, test_db::setup_all, ClinicianRow, ClinicianRowRepository};

    #[actix_rt::test]
    async fn clinician_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "clinician_is_sync_update",
            MockDataInserts::none().items().units(),
        )
        .await;

        let repo = ClinicianRowRepository::new(&connection);

        // Two rows, to make sure is_sync_update update only affects one row
        let row = ClinicianRow {
            id: uuid(),
            ..Default::default()
        };
        let row2 = ClinicianRow {
            id: uuid(),
            ..Default::default()
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
