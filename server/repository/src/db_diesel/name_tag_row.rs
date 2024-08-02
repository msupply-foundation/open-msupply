use super::{name_tag_row::name_tag::dsl as name_tag_dsl, StorageConnection};

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    name_tag (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = name_tag)]
pub struct NameTagRow {
    pub id: String,
    pub name: String,
}

pub struct NameTagRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameTagRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameTagRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameTagRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_tag_dsl::name_tag)
            .values(row)
            .on_conflict(name_tag_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameTagRow>, RepositoryError> {
        let result = name_tag_dsl::name_tag
            .filter(name_tag_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name(&self, name: &str) -> Result<Option<NameTagRow>, RepositoryError> {
        let result = name_tag_dsl::name_tag
            .filter(name_tag_dsl::name.like(name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_tag_dsl::name_tag.filter(name_tag_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for NameTagRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        NameTagRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameTagRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test_name_tag_row {
    use crate::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        NameRow, NameTagRow, NameTagRowRepository,
    };

    #[actix_rt::test]
    async fn test_name_tag_repository() {
        let (_, connection, _, _) = setup_all_with_data(
            "omsupply-database-test_store_tag_repository",
            MockDataInserts::none(),
            MockData {
                names: vec![NameRow {
                    id: "name1".to_string(),
                    ..Default::default()
                }],

                ..Default::default()
            },
        )
        .await;

        /* TESTS */

        // Check we can insert a name tag
        let name_tag_row = NameTagRow {
            id: "tag_name_id".to_string(),
            name: "tag1".to_string(),
        };

        NameTagRowRepository::new(&connection)
            .upsert_one(&name_tag_row)
            .unwrap();

        // Check we can find the name tag by id
        let found_name_tag = NameTagRowRepository::new(&connection)
            .find_one_by_id(&name_tag_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(found_name_tag.id, name_tag_row.id);
        assert_eq!(found_name_tag.name, name_tag_row.name);

        // Check we can update a name tag
        let name_tag_row = NameTagRow {
            id: "tag_name_id".to_string(),
            name: "tag1-b".to_string(),
        };
        NameTagRowRepository::new(&connection)
            .upsert_one(&name_tag_row)
            .unwrap();

        // Check the name tag has been updated

        let found_name_tag = NameTagRowRepository::new(&connection)
            .find_one_by_id(&name_tag_row.id)
            .unwrap()
            .unwrap();
        assert_eq!(found_name_tag.id, name_tag_row.id);
        assert_eq!(found_name_tag.name, name_tag_row.name);
    }
}
