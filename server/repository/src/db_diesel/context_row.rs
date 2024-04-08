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
    connection: &'a mut StorageConnection,
}

impl<'a> ContextRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        ContextRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::insert_into(context::dsl::context)
            .values(row)
            .on_conflict(context::dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::replace_into(context::dsl::context)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&mut self, row: &ContextRow) -> Result<(), RepositoryError> {
        diesel::insert_into(context::dsl::context)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_all(&mut self) -> Result<Vec<ContextRow>, RepositoryError> {
        let result = context::dsl::context.load(&mut self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(&mut self, row_id: &str) -> Result<Option<ContextRow>, RepositoryError> {
        let result = context::dsl::context
            .filter(context::dsl::id.eq(row_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

impl Upsert for ContextRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        ContextRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            ContextRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
