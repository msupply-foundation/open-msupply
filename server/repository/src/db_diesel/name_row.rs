use super::{name_row::name::dsl::*, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    #[sql_name = "name"]
    name (id) {
        id -> Text,
        #[sql_name = "name"] name_  -> Text,
        code -> Text,
        is_customer -> Bool,
        is_supplier -> Bool,
        // TODO, this is temporary, remove
        legacy_record -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "name"]
pub struct NameRow {
    pub id: String,
    #[column_name = "name_"]
    pub name: String,
    pub code: String,
    pub is_customer: bool,
    pub is_supplier: bool,
    // TODO, this is temporary, remove
    pub legacy_record: String,
}

pub struct NameRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .on_conflict(id)
            .do_update()
            .set(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, name_id: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq(name_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_code(&self, name_code: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(code.eq(name_code))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
