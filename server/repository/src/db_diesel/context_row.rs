use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
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

    fn _upsert_one(&self, row: &ContextRow) -> Result<(), RepositoryError> {
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ContextRow>, RepositoryError> {
        Ok(context::dsl::context
            .filter(context::dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ContextRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ContextRowRepository::new(con)._upsert_one(self)?;

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
            ContextRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
