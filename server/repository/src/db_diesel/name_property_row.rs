use super::{name_property_row::name_property::dsl::*, property_row::property};

use serde::{Deserialize, Serialize};

use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
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

    pub fn upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<(), RepositoryError> {
        self._upsert_one(name_property_row)?;
        let changelog = NamePropertyRow::generate_changelog(
            name_property_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NamePropertyRow>, RepositoryError> {
        Ok(name_property::table
            .filter(name_property::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for NamePropertyRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        NamePropertyRowRepository::new(con)._upsert_one(self)?;

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
            NamePropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
