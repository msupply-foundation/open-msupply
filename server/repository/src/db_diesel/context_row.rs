use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    context (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
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

    pub fn upsert_one(&self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::insert_into(context::dsl::context)
            .values(row)
            .on_conflict(context::dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
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
}

impl Upsert for ContextRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ContextRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ContextRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
