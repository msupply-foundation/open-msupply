use super::{name_tag_join::name_tag_join::dsl as name_tag_join_dsl, StorageConnection};
use crate::repository_error::RepositoryError;
use crate::{name_link, Delete, Upsert};
use diesel::prelude::*;

table! {
    name_tag_join (id) {
        id -> Text,
        name_link_id -> Text,
        name_tag_id -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = name_tag_join)]
pub struct NameTagJoinRow {
    pub id: String,
    pub name_link_id: String,
    pub name_tag_id: String,
}

joinable!(name_tag_join -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(name_tag_join, name_link);

pub struct NameTagJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameTagJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameTagJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameTagJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_tag_join_dsl::name_tag_join)
            .values(row)
            .on_conflict(name_tag_join_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameTagJoinRow>, RepositoryError> {
        let result = name_tag_join_dsl::name_tag_join
            .filter(name_tag_join_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_tag_join_dsl::name_tag_join.filter(name_tag_join_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct NameTagJoinRowDelete(pub String);
impl Delete for NameTagJoinRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        NameTagJoinRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            NameTagJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for NameTagJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        NameTagJoinRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameTagJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test_name_tag_row {
    use crate::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        NameRow, NameTagJoinRepository, NameTagJoinRow, NameTagRow, NameTagRowRepository,
    };

    #[actix_rt::test]
    async fn test_name_tag_join_repository() {
        let (_, connection, _, _) = setup_all_with_data(
            "omsupply-database-test_name_tag_join_repository",
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

        let repo = NameTagJoinRepository::new(&connection);

        // Check we can insert a name tag join
        let name_tag_join_row = NameTagJoinRow {
            id: "name_tag_join_id".to_string(),
            name_link_id: "name1".to_string(),
            name_tag_id: name_tag_row.id.clone(),
        };
        repo.upsert_one(&name_tag_join_row).unwrap();

        // Check we can find a name tag join
        let found_name_tag_join_row = repo.find_one_by_id(&name_tag_join_row.id).unwrap();
        assert_eq!(found_name_tag_join_row, Some(name_tag_join_row));
    }
}
