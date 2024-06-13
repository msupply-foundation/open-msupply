use super::{user_row::user_account::dsl as user_account_dsl, StorageConnection};

use crate::{lower, repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    user_account (id) {
        id -> Text,
        username -> Text,
        hashed_password -> Text,
        email -> Nullable<Text>,
        language -> crate::db_diesel::user_row::LanguageTypeMapping,
        first_name -> Nullable<Text>,
        last_name -> Nullable<Text>,
        phone_number -> Nullable<Text>,
        job_title -> Nullable<Text>,
        last_successful_sync -> Nullable<Timestamp>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum LanguageType {
    #[default]
    English,
    French,
    Spanish,
    Laos,
    Khmer,
    Portuguese,
    Russian,
    Tetum,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = user_account)]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub hashed_password: String,
    pub email: Option<String>,
    pub language: LanguageType,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone_number: Option<String>,
    pub job_title: Option<String>,
    pub last_successful_sync: Option<NaiveDateTime>,
}

pub struct UserAccountRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &UserAccountRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_account_dsl::user_account)
            .values(row)
            .on_conflict(user_account_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn insert_one(&self, user_account_row: &UserAccountRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_account_dsl::user_account)
            .values(user_account_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        account_id: &str,
    ) -> Result<Option<UserAccountRow>, RepositoryError> {
        let result: Result<UserAccountRow, diesel::result::Error> = user_account_dsl::user_account
            .filter(user_account_dsl::id.eq(account_id))
            .first(self.connection.lock().connection());
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
            .first(self.connection.lock().connection());

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
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete_by_id(&self, id: &str) -> Result<usize, RepositoryError> {
        let result = diesel::delete(user_account_dsl::user_account)
            .filter(user_account_dsl::id.eq(id))
            .execute(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for UserAccountRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        UserAccountRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            UserAccountRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::MockDataInserts, test_db::setup_all, LanguageType, UserAccountRow,
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
        for variant in LanguageType::iter() {
            let id = format!("{:?}", variant);
            let result = repo.insert_one(&inline_init(|r: &mut UserAccountRow| {
                r.id.clone_from(&id);
                r.language = variant.clone();
            }));
            assert_eq!(result, Ok(()));

            let result = repo.find_one_by_id(&id).unwrap().unwrap();
            assert_eq!(result.language, variant);
        }
    }
}
