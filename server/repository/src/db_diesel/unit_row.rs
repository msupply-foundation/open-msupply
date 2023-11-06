use super::{unit_row::unit::dsl::*, StorageConnection};
use crate::repository_error::RepositoryError;
use diesel::prelude::*;

table! {
    unit (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        index -> Integer,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = unit)]
pub struct UnitRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub index: i32,
}

pub struct UnitRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> UnitRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        UnitRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
        diesel::insert_into(unit)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &UnitRow) -> Result<(), RepositoryError> {
        diesel::replace_into(unit)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&mut self, unit_id: &str) -> Result<UnitRow, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id_option(&self, unit_id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        let result = unit
            .filter(id.eq(unit_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, unit_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(unit.filter(id.eq(unit_id))).execute(&mut self.connection.connection)?;
        Ok(())
    }
}
