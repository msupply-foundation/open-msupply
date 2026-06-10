use super::property_table_v2_row::property_table_v2::dsl::*;

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

table! {
    property_table_v2 (id) {
        id -> Text,
        property_id -> Text,
        table_name -> Text,
        is_visible -> Bool,
    }
}

use super::property_v2_row::property_v2;
joinable!(property_table_v2 -> property_v2 (property_id));
allow_tables_to_appear_in_same_query!(property_table_v2, property_v2);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_table_v2)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyTableV2Row {
    pub id: String,
    pub property_id: String,
    pub table_name: String,
    pub is_visible: bool,
}

pub struct PropertyTableV2RowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyTableV2RowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyTableV2RowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyTableV2Row) -> Result<(), RepositoryError> {
        diesel::insert_into(property_table_v2)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyTableV2Row) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyTableV2Row::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyTableV2Row>, RepositoryError> {
        let result = property_table_v2.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<PropertyTableV2Row>, RepositoryError> {
        let result = property_table_v2
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_table_v2)
            .filter(id.eq(row_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PropertyTableV2Row>, RepositoryError> {
        Ok(property_table_v2::table
            .filter(property_table_v2::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for PropertyTableV2Row {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyTableV2RowRepository::new(con)._upsert_one(self)?;

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

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PropertyTableV2RowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
