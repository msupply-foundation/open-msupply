use diesel::prelude::*;

use crate::{RepositoryError, StorageConnection};

table! {
    site (site_id) {
        site_id -> Integer,
        username -> Text,
        password_sha256 -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = site)]
pub struct SiteRow {
    pub site_id: i32,
    pub username: String,
    pub password_sha256: String,
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
            .on_conflict(site::site_id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(&self, id: i32) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site::table
            .filter(site::site_id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_by_username_and_password(
        &self,
        username: &str,
        password_sha256: &str,
    ) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site::table
            .filter(site::username.eq(username))
            .filter(site::password_sha256.eq(password_sha256))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
