use super::{
    item_link_row::item_link, master_list_line_row::master_list_line::dsl::*,
    master_list_row::master_list, StorageConnection,
};
use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert,
};

use diesel::prelude::*;

table! {
    master_list_line (id) {
        id -> Text,
        item_link_id -> Text,
        master_list_id -> Text,
        price_per_unit -> Nullable<Double>,
    }
}

joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_line -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(master_list_line, item_link);

#[derive(Clone, Insertable, Queryable, Debug, Default, PartialEq, AsChangeset, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = master_list_line)]
pub struct MasterListLineRow {
    pub id: String,
    pub item_link_id: String,
    pub master_list_id: String,
    pub price_per_unit: Option<f64>,
}

pub struct MasterListLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRowRepository { connection }
    }

    fn _upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = MasterListLineRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        line_id: &str,
    ) -> Result<Option<MasterListLineRow>, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<MasterListLineRow>, RepositoryError> {
        Ok(master_list_line
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_line.filter(id.eq(line_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, line_id: &str) -> Result<(), RepositoryError> {
        self._delete(line_id)?;
        let changelog = MasterListLineRow::generate_changelog(
            line_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for MasterListLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        MasterListLineRowRepository::new(con)._upsert_one(self)?;

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
            MasterListLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct MasterListLineRowDelete(pub String);
impl Delete for MasterListLineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = MasterListLineRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                MasterListLineRow::generate_changelog(
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
            MasterListLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
