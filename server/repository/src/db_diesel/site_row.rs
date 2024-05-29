use crate::{lower, site_row::site::dsl as site_dsl, RepositoryError, StorageConnection};
use diesel::prelude::*;
use serde::Serialize;

table! {
    site (id) {
        id -> Text,
        site_id -> Integer,
        hardware_id -> Text,
        name -> Text,
        hashed_password -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize)]
#[table_name = "site"]
pub struct SiteRow {
    pub id: String,
    pub site_id: i32,
    pub hardware_id: String,
    pub name: String,
    pub hashed_password: String,
}

pub struct SiteRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SiteRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SiteRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &SiteRow) -> Result<(), RepositoryError> {
        diesel::insert_into(site_dsl::site)
            .values(row)
            .on_conflict(site_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &SiteRow) -> Result<(), RepositoryError> {
        diesel::replace_into(site_dsl::site)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &SiteRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site_dsl::site
            .filter(site_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name(&self, site_name: &str) -> Result<Option<SiteRow>, RepositoryError> {
        let result = site_dsl::site
            .filter(lower(site_dsl::name).eq(lower(site_name)))
            .first(&self.connection.connection);

        match result {
            Ok(row) => Ok(Some(row)),
            Err(err) => match err {
                diesel::result::Error::NotFound => Ok(None),
                _ => Err(RepositoryError::from(err)),
            },
        }
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SiteRow>, RepositoryError> {
        Ok(site_dsl::site
            .filter(site_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }

    // todo not needed?
    pub fn find_many_by_hardware_id(
        &self,
        hardware_id: &str,
    ) -> Result<Vec<SiteRow>, RepositoryError> {
        Ok(site_dsl::site
            .filter(site_dsl::hardware_id.eq(hardware_id))
            .load(&self.connection.connection)?)
    }

    // TODO: SiteRepo with query instead of this lol
    pub fn get_all(&self) -> Result<Vec<SiteRow>, RepositoryError> {
        Ok(site_dsl::site
            // .filter(site_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }
}
