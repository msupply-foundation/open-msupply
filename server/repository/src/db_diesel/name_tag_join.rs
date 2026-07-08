use super::{name_oms_fields, name_tag_row::name_tag, StorageConnection};
use crate::diesel_macros::define_linked_tables;
use crate::name_row::name;
use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert,
};
use diesel::prelude::*;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = name_tag_join)]
pub struct NameTagJoinRow {
    pub id: String,
    pub name_tag_id: String,
    pub name_id: String,
}

define_linked_tables!(
    view: name_tag_join = "name_tag_join_view",
    core: name_tag_join_with_links = "name_tag_join",
    struct: NameTagJoinRow,
    repo: NameTagJoinRepository,
    shared: {
        name_tag_id -> Text,
    },
    links: {
        name_link_id -> name_id,
    },
    optional_links: {
    }
);

joinable!(name_tag_join -> name (name_id));
joinable!(name_tag_join -> name_tag (name_tag_id));
allow_tables_to_appear_in_same_query!(name_tag_join, name_oms_fields);

pub struct NameTagJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameTagJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameTagJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameTagJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = NameTagJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameTagJoinRow>, RepositoryError> {
        let result = name_tag_join::table
            .filter(name_tag_join::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameTagJoinRow>, RepositoryError> {
        Ok(name_tag_join::table
            .filter(name_tag_join::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_tag_join_with_links::table.filter(name_tag_join_with_links::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        self._delete(id)?;
        let changelog = NameTagJoinRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct NameTagJoinRowDelete(pub String);
impl Delete for NameTagJoinRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = NameTagJoinRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                NameTagJoinRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
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
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        NameTagJoinRepository::new(con)._upsert(self)?;

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
            name_id: "name1".to_string(),
            name_tag_id: name_tag_row.id.clone(),
        };
        repo.upsert_one(&name_tag_join_row).unwrap();

        // Check we can find a name tag join
        let found_name_tag_join_row = repo.find_one_by_id(&name_tag_join_row.id).unwrap();
        assert_eq!(found_name_tag_join_row, Some(name_tag_join_row));
    }
}
