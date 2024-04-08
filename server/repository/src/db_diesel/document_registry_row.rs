use super::{
    document_registry_row::document_registry::dsl as document_registry_dsl, StorageConnection,
};

use crate::{db_diesel::form_schema_row::form_schema, RepositoryError, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum DocumentRegistryCategory {
    Patient,
    ProgramEnrolment,
    Encounter,
    ContactTrace,
    Custom,
}

table! {
    document_registry (id) {
        id -> Text,
        category -> crate::DocumentRegistryCategoryMapping,
        document_type -> Text,
        context_id -> Text,
        name -> Nullable<Text>,
        form_schema_id -> Nullable<Text>,
        config -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(table_name = document_registry)]
pub struct DocumentRegistryRow {
    pub id: String,
    /// The category of the document registry row, e.g. Patient or ProgramEnrolment.
    pub category: DocumentRegistryCategory,
    pub document_type: String,
    /// The context of the document, e.g. the program id
    pub context_id: String,
    pub name: Option<String>,
    pub form_schema_id: Option<String>,
    pub config: Option<String>,
}

joinable!(document_registry -> form_schema (form_schema_id));

allow_tables_to_appear_in_same_query!(document_registry, form_schema);

pub struct DocumentRegistryRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> DocumentRegistryRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        DocumentRegistryRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(document_registry_dsl::document_registry)
            .values(row)
            .on_conflict(document_registry_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        diesel::replace_into(document_registry_dsl::document_registry)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &mut self,
        id: &str,
    ) -> Result<Option<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional()?)
    }

    pub fn find_many_by_id(
        &mut self,
        ids: &[String],
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq_any(ids))
            .load(&mut self.connection.connection)?)
    }

    pub fn delete(&mut self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            document_registry_dsl::document_registry.filter(document_registry_dsl::id.eq(id)),
        )
        .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for DocumentRegistryRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        DocumentRegistryRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            DocumentRegistryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
