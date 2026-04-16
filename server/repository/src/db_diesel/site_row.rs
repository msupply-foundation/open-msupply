use crate::{RepositoryError, StorageConnection};
use diesel::prelude::*;

table! {
    site (id) {
        id -> Integer,
        name -> Text,
        hashed_password -> Text,
        hardware_id -> Nullable<Text>,
        token -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = site)]
#[diesel(treat_none_as_null = true)]
pub struct SiteRow {
    pub id: i32,
    pub name: String,
    pub hashed_password: String,
    pub hardware_id: Option<String>,
    pub token: Option<String>,
}

pub struct SiteRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SiteRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SiteRowRepository { connection }
    }

    pub fn upsert(&self, row: &SiteRow) -> Result<(), RepositoryError> {
        diesel::insert_into(site::table)
            .values(row)
            .on_conflict(site::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(&self, id: i32) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site::table
            .filter(site::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_by_name_and_password(
        &self,
        name: &str,
        hashed_password: &str,
    ) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site::table
            .filter(site::name.eq(name))
            .filter(site::hashed_password.eq(hashed_password))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
