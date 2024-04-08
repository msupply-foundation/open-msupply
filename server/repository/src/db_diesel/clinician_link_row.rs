use super::{
    clinician_row::clinician, invoice_line_row::invoice_line, invoice_row::invoice, name_row::name,
    program_row::program, store_row::store, StorageConnection,
};
use crate::{name_link, repository_error::RepositoryError, Upsert};

use self::clinician_link::dsl as clinician_link_dsl;
use diesel::prelude::*;

table! {
    clinician_link (id) {
        id -> Text,
        clinician_id -> Text,
    }
}

joinable!(clinician_link -> clinician (clinician_id));
allow_tables_to_appear_in_same_query!(clinician_link, name);
allow_tables_to_appear_in_same_query!(clinician_link, store);
allow_tables_to_appear_in_same_query!(clinician_link, invoice);
allow_tables_to_appear_in_same_query!(clinician_link, invoice_line);
allow_tables_to_appear_in_same_query!(clinician_link, program);
allow_tables_to_appear_in_same_query!(clinician_link, name_link);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = clinician_link)]
pub struct ClinicianLinkRow {
    pub id: String,
    pub clinician_id: String,
}

pub struct ClinicianLinkRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> ClinicianLinkRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        ClinicianLinkRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &mut self,
        clinician_link_row: &ClinicianLinkRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician_link_dsl::clinician_link)
            .values(clinician_link_row)
            .on_conflict(clinician_link::id)
            .do_update()
            .set(clinician_link_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &mut self,
        clinician_link_row: &ClinicianLinkRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(clinician_link_dsl::clinician_link)
            .values(clinician_link_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    pub fn insert_one_or_ignore(
        &mut self,
        clinician_link_row: &ClinicianLinkRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(clinician_link_dsl::clinician_link)
            .values(clinician_link_row)
            .on_conflict(clinician_link::id)
            .do_nothing()
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn insert_one_or_ignore(
        &mut self,
        clinician_link_row: &ClinicianLinkRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_or_ignore_into(clinician_link_dsl::clinician_link)
            .values(clinician_link_row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_all(&mut self) -> Result<Vec<ClinicianLinkRow>, RepositoryError> {
        let result = clinician_link_dsl::clinician_link.load(&mut self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &mut self,
        clinician_link_id: &str,
    ) -> Result<Option<ClinicianLinkRow>, RepositoryError> {
        let result = clinician_link_dsl::clinician_link
            .filter(clinician_link::id.eq(clinician_link_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &mut self,
        clinician_link_ids: &[String],
    ) -> Result<Vec<ClinicianLinkRow>, RepositoryError> {
        let result = clinician_link_dsl::clinician_link
            .filter(clinician_link::id.eq_any(clinician_link_ids))
            .load(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_clinician_id(
        &mut self,
        clinician_id: &str,
    ) -> Result<Vec<ClinicianLinkRow>, RepositoryError> {
        let result = clinician_link_dsl::clinician_link
            .filter(clinician_link::clinician_id.eq(clinician_id))
            .load::<ClinicianLinkRow>(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn delete(&mut self, clinician_link_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            clinician_link_dsl::clinician_link.filter(clinician_link::id.eq(clinician_link_id)),
        )
        .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for ClinicianLinkRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        ClinicianLinkRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            ClinicianLinkRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
