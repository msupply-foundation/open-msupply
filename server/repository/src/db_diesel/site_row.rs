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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};

    fn site_row_a() -> SiteRow {
        SiteRow {
            id: 1,
            name: "site_a".to_string(),
            hashed_password: "hash_a".to_string(),
            hardware_id: Some("hw-id-a".to_string()),
            token: None,
        }
    }

    fn site_row_b() -> SiteRow {
        SiteRow {
            id: 2,
            name: "site_b".to_string(),
            hashed_password: "hash_b".to_string(),
            hardware_id: None,
            token: Some("token_b".to_string()),
        }
    }

    #[actix_rt::test]
    async fn site_row_repository_upsert_and_find_by_id() {
        let (_, connection, _, _) = setup_all(
            "site_row_repository_upsert_and_find_by_id",
            MockDataInserts::none(),
        )
        .await;
        let repo = SiteRowRepository::new(&connection);

        repo.upsert(&site_row_a()).unwrap();
        assert_eq!(repo.find_one_by_id(1).unwrap(), Some(site_row_a()));
        assert_eq!(repo.find_one_by_id(999).unwrap(), None);

        let updated = SiteRow {
            hashed_password: "new_hash".to_string(),
            token: Some("new_token".to_string()),
            ..site_row_a()
        };
        repo.upsert(&updated).unwrap();
        assert_eq!(repo.find_one_by_id(1).unwrap(), Some(updated));
    }

    #[actix_rt::test]
    async fn site_row_repository_find_by_name_and_password() {
        let (_, connection, _, _) = setup_all(
            "site_row_repository_find_by_name_and_password",
            MockDataInserts::none(),
        )
        .await;
        let repo = SiteRowRepository::new(&connection);

        repo.upsert(&site_row_a()).unwrap();
        repo.upsert(&site_row_b()).unwrap();

        assert_eq!(
            repo.find_by_name_and_password("site_a", "hash_a").unwrap(),
            Some(site_row_a())
        );

        // Wrong password
        assert_eq!(
            repo.find_by_name_and_password("site_a", "wrong_hash")
                .unwrap(),
            None
        );

        // Wrong name
        assert_eq!(
            repo.find_by_name_and_password("no_such_site", "hash_a")
                .unwrap(),
            None
        );

        // Site with no hardware_id and with a token
        assert_eq!(
            repo.find_by_name_and_password("site_b", "hash_b").unwrap(),
            Some(site_row_b())
        );
    }

    #[actix_rt::test]
    async fn site_row_repository_hardware_id_nullable() {
        let (_, connection, _, _) = setup_all(
            "site_row_repository_hardware_id_nullable",
            MockDataInserts::none(),
        )
        .await;
        let repo = SiteRowRepository::new(&connection);

        repo.upsert(&site_row_b()).unwrap();
        let found = repo.find_one_by_id(2).unwrap().unwrap();
        assert_eq!(found.hardware_id, None);

        let with_hw = SiteRow {
            hardware_id: Some("hw-id-b".to_string()),
            ..site_row_b()
        };
        repo.upsert(&with_hw).unwrap();
        let found = repo.find_one_by_id(2).unwrap().unwrap();
        assert_eq!(found.hardware_id, Some("hw-id-b".to_string()));

        repo.upsert(&site_row_b()).unwrap();
        let found = repo.find_one_by_id(2).unwrap().unwrap();
        assert_eq!(found.hardware_id, None);
    }
}
