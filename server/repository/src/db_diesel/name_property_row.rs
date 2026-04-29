use super::{name_property_row::name_property::dsl::*, property_row::property};

use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::KeyValueStoreRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

use diesel::prelude::*;

table! {
    name_property (id) {
        id -> Text,
        property_id -> Text,
        remote_editable -> Bool,
    }
}
joinable!(name_property -> property (property_id));
allow_tables_to_appear_in_same_query!(name_property, property);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = name_property)]
#[diesel(treat_none_as_null = true)]
pub struct NamePropertyRow {
    pub id: String,
    pub property_id: String,
    pub remote_editable: bool,
}

impl NamePropertyRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameProperty,
            record_id: self.id.clone(),
            row_action: action,
            store_id: None,
            name_id: None,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
}

pub struct NamePropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NamePropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NamePropertyRowRepository { connection }
    }

    pub fn _upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_property)
            .values(name_property_row)
            .on_conflict(id)
            .do_update()
            .set(name_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<i64, RepositoryError> {
        self._upsert_one(name_property_row)?;
        let changelog = name_property_row.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<NamePropertyRow>, RepositoryError> {
        let result = name_property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        name_property_id: &str,
    ) -> Result<Option<NamePropertyRow>, RepositoryError> {
        let result = name_property
            .filter(id.eq(name_property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, name_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_property)
            .filter(id.eq(name_property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for NamePropertyRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        NamePropertyRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NamePropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
