use super::{name_oms_fields, StorageConnection};

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, Delete,
    RowActionType, SourceSiteId, Upsert,
};

use diesel::prelude::*;

table! {
    name_tag (id) {
        id -> Text,
        name -> Text,
    }
}

allow_tables_to_appear_in_same_query!(name_tag, name_oms_fields);

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
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

    fn _upsert_one(&self, row: &NameTagRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_tag::table)
            .values(row)
            .on_conflict(name_tag::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &NameTagRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = NameTagRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameTagRow>, RepositoryError> {
        let result = name_tag::table
            .filter(name_tag::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameTagRow>, RepositoryError> {
        Ok(name_tag::table
            .filter(name_tag::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_one_by_name(&self, name: &str) -> Result<Option<NameTagRow>, RepositoryError> {
        let result = name_tag::table
            .filter(name_tag::name.like(name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_tag::table.filter(name_tag::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        self._delete(id)?;
        let changelog = NameTagRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for NameTagRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        NameTagRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameTagRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct NameTagRowDelete(pub String);
impl Delete for NameTagRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = NameTagRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => NameTagRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            NameTagRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
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
