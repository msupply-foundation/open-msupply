use super::{name_tag_row::name_tag::dsl as name_tag_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    name_tag (id) {
        id -> Text,
        tag_name -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "name_tag"]
pub struct NameTagRow {
    pub id: String,
    pub tag_name: String,
}

pub struct NameTagRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameTagRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameTagRowRepository { connection }
    }

    pub fn insert_one(&self, name_tag_row: &NameTagRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_tag_dsl::name_tag)
            .values(name_tag_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn update_one(&self, name_tag_row: &NameTagRow) -> Result<(), RepositoryError> {
        diesel::update(name_tag_dsl::name_tag.filter(name_tag_dsl::id.eq(&name_tag_row.id)))
            .set(name_tag_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameTagRow>, RepositoryError> {
        let result = name_tag_dsl::name_tag
            .filter(name_tag_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_tag_dsl::name_tag.filter(name_tag_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

#[cfg(test)]
mod test_name_tag_row {
    use crate::{test_db, NameRow, NameRowRepository, NameTagRow, NameTagRowRepository};

    #[actix_rt::test]
    async fn test_name_tag_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-test_name_tag_repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRowRepository::new(&connection)
            .insert_one(&NameRow {
                id: "name1".to_string(),
                name: "name1".to_string(),
                code: "name1".to_string(),
                ..Default::default()
            })
            .await
            .unwrap();

        /* TESTS */

        let repo = NameTagRowRepository::new(&connection);

        // Check we can insert a name tag
        let name_tag_row = NameTagRow {
            id: "tag1".to_string(),
            tag_name: "tag1".to_string(),
        };

        repo.insert_one(&name_tag_row).unwrap();

        // Check we can find a store tag by id
        let found_name_tag = NameTagRowRepository::new(&connection)
            .find_one_by_id(&name_tag_row.id)
            .unwrap();
        assert_eq!(found_name_tag, Some(name_tag_row));
    }
}
