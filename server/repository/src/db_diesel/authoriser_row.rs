use super::{authoriser::dsl as authoriser_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    authoriser (id) {
        id -> Text,
        is_active -> Bool,
        master_list_id -> Text,
        user_id -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "authoriser"]
pub struct AuthoriserRow {
    pub id: String,
    pub is_active: bool,
    pub master_list_id: String,
    pub user_id: String,
}

impl Default for AuthoriserRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            is_active: Default::default(),
            master_list_id: Default::default(),
            user_id: Default::default(),
        }
    }
}

pub struct AuthoriserRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AuthoriserRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AuthoriserRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &AuthoriserRow) -> Result<(), RepositoryError> {
        diesel::insert_into(authoriser_dsl::authoriser)
            .values(row)
            .on_conflict(authoriser_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &AuthoriserRow) -> Result<(), RepositoryError> {
        diesel::replace_into(authoriser_dsl::authoriser)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<AuthoriserRow>, RepositoryError> {
        let result = authoriser_dsl::authoriser
            .filter(authoriser_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_user_id(
        &self,
        user_id: &str,
    ) -> Result<Vec<AuthoriserRow>, RepositoryError> {
        let result = authoriser_dsl::authoriser
            .filter(authoriser_dsl::user_id.eq(user_id))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
