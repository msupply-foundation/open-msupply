use super::{
    document_registry_row::document_registry::dsl as document_registry_dsl, StorageConnection,
};

use crate::{db_diesel::form_schema_row::form_schema, RepositoryError};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum DocumentContext {
    Patient,
    Program,
    Encounter,
    Custom,
}

table! {
    document_registry (id) {
        id -> Text,
        document_type -> Text,
        context -> crate::DocumentContextMapping,
        name -> Nullable<Text>,
        parent_id -> Nullable<Text>,
        form_schema_id -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "document_registry"]
pub struct DocumentRegistryRow {
    pub id: String,
    pub document_type: String,
    pub context: DocumentContext,
    pub name: Option<String>,
    pub parent_id: Option<String>,
    pub form_schema_id: Option<String>,
}

joinable!(document_registry -> form_schema (form_schema_id));

allow_tables_to_appear_in_same_query!(document_registry, form_schema);

pub struct DocumentRegistryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DocumentRegistryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRegistryRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(document_registry_dsl::document_registry)
            .values(row)
            .on_conflict(document_registry_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        diesel::replace_into(document_registry_dsl::document_registry)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            document_registry_dsl::document_registry.filter(document_registry_dsl::id.eq(id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}
