use super::StorageConnection;

use crate::{
    db_diesel::form_schema_row::form_schema, ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, Upsert,
};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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
        plugin_code -> Nullable<Text>,
        program_key -> Nullable<Text>,
    }
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    serde::Serialize,
    serde::Deserialize,
)]
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
    /// The form plugin that installed this entry and is its only writer. `None`
    /// for an entry written any other way (pulled from legacy central, or by
    /// `insertDocumentRegistry`), which a plugin may take over only when told to.
    pub plugin_code: Option<String>,
    /// The owning plugin's name for the program this entry belongs to, set for
    /// every category but Patient. The program it stands for is `context_id`,
    /// chosen when the plugin is installed.
    pub program_key: Option<String>,
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

    fn _upsert_one(&self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(document_registry::table)
            .values(row)
            .on_conflict(document_registry::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &DocumentRegistryRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = DocumentRegistryRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry::table
            .filter(document_registry::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry::table
            .filter(document_registry::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_document_type(
        &self,
        document_type: &str,
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry::table
            .filter(document_registry::document_type.eq(document_type))
            .order(document_registry::id)
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_category(
        &self,
        category: DocumentRegistryCategory,
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry::table
            .filter(document_registry::category.eq(category))
            .order(document_registry::id)
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_plugin_code(
        &self,
        plugin_code: &str,
    ) -> Result<Vec<DocumentRegistryRow>, RepositoryError> {
        Ok(document_registry::table
            .filter(document_registry::plugin_code.eq(plugin_code))
            .order(document_registry::id)
            .load(self.connection.lock().connection())?)
    }

    // pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(
    //         document_registry::table.filter(document_registry::id.eq(id)),
    //     )
    //     .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for DocumentRegistryRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        DocumentRegistryRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DocumentRegistryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
