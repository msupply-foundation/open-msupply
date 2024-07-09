use super::{
    document_registry_row::document_registry::dsl as document_registry_dsl, StorageConnection,
};

use crate::{db_diesel::form_schema_row::form_schema, RepositoryError, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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
    connection: &'a StorageConnection,
}

impl<'a> DocumentRegistryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRegistryRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &DocumentRegistryRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(document_registry_dsl::document_registry)
            .values(row)
            .on_conflict(document_registry_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Document,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry_dsl::document_registry
            .filter(document_registry_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    // pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(
    //         document_registry_dsl::document_registry.filter(document_registry_dsl::id.eq(id)),
    //     )
    //     .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for DocumentRegistryRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = DocumentRegistryRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DocumentRegistryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
