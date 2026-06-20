use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, RowActionType, SourceSiteId,
};

use diesel::prelude::*;

table! {
    context (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = context)]
pub struct ContextRow {
    pub id: String,
    pub name: String,
}

pub struct ContextRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContextRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContextRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::insert_into(context::dsl::context)
            .values(row)
            .on_conflict(context::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ContextRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ContextRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub async fn insert_one(&self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::insert_into(context::dsl::context)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub async fn find_all(&mut self) -> Result<Vec<ContextRow>, RepositoryError> {
        let result = context::dsl::context.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<Option<ContextRow>, RepositoryError> {
        let result = context::dsl::context
            .filter(context::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, row_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            context::dsl::context.filter(context::dsl::id.eq(row_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ContextRow>, RepositoryError> {
        Ok(context::dsl::context
            .filter(context::dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
