use super::{user_row::user_account::dsl as user_account_dsl, StorageConnection, User};

use crate::{lower, repository_error::RepositoryError};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    user_account (id) {
        id -> Text,
        username -> Text,
        hashed_password -> Text,
        email -> Nullable<Text>,
        language -> crate::db_diesel::user_row::LanguageMapping,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Language {
    English,
    French,
    Spanish,
    Laos,
    Khmer,
    Portuguese,
    Russian,
}

impl Default for Language {
    fn default() -> Self {
        Self::English
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, Default)]
#[table_name = "user_account"]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub hashed_password: String,
    pub email: Option<String>,
    pub language: Language,
}

pub struct UserAccountRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountRowRepository { connection }
    }

    pub fn insert_one(&self, user_account_row: &UserAccountRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_account_dsl::user_account)
            .values(user_account_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        account_id: &str,
    ) -> Result<Option<UserAccountRow>, RepositoryError> {
        let result: Result<UserAccountRow, diesel::result::Error> = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq(account_id))
            .first(&self.connection.connection);
        match result {
            Ok(row) => Ok(Some(row)),
            Err(err) => match err {
                diesel::result::Error::NotFound => Ok(None),
                _ => Err(RepositoryError::from(err)),
            },
        }
    }

    pub fn find_one_by_user_name(
        &self,
        username: &str,
    ) -> Result<Option<UserAccountRow>, RepositoryError> {
        let result: Result<UserAccountRow, diesel::result::Error> = user_account_dsl::user_account
            .filter(lower(user_account_dsl::username).eq(lower(username)))
            .first(&self.connection.connection);

        match result {
            Ok(row) => Ok(Some(row)),
            Err(err) => match err {
                diesel::result::Error::NotFound => Ok(None),
                _ => Err(RepositoryError::from(err)),
            },
        }
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<UserAccountRow>, RepositoryError> {
        let result = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn delete_by_id(&self, id: &str) -> Result<usize, RepositoryError> {
        let result = diesel::delete(user_account_dsl::user_account)
            .filter(user_account_dsl::id.eq(id))
            .execute(&self.connection.connection)?;
        Ok(result)
    }
}

// TODO
// Users don't sync and will only be available after first log in, thus in schema reference is not enforced
// API consumers would like users to be returned for records that are linked to them, as if reference was enforced
// Using uknown user until we start syncing users
pub fn unknown_user() -> User {
    User {
        user_row: UserAccountRow {
            id: "unknown".to_string(),
            username: "unknown".to_string(),
            hashed_password: "unknown".to_string(),
            email: Some("unknown@sussol.net".to_string()),
            language: Default::default(),
        },
        stores: vec![],
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::MockDataInserts, test_db::setup_all, Language, UserAccountRow,
        UserAccountRowRepository,
    };
    use strum::IntoEnumIterator;
    use util::inline_init;

    #[actix_rt::test]
    async fn user_row_language_enum() {
        let (_, connection, _, _) =
            setup_all("user_row_language_enum", MockDataInserts::none()).await;

        let repo = UserAccountRowRepository::new(&connection);
        // Try upsert all variants of Language, confirm that diesel enums match postgres
        for variant in Language::iter() {
            let id = format!("{:?}", variant);
            let result = repo.insert_one(&inline_init(|r: &mut UserAccountRow| {
                r.id = id.clone();
                r.language = variant.clone();
            }));
            assert_eq!(result, Ok(()));

            let result = repo.find_one_by_id(&id).unwrap().unwrap();
            assert_eq!(result.language, variant);
        }
    }
}
