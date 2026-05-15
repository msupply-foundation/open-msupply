use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, Delete,
    RowActionType, SourceSiteId, Upsert,
};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::db_diesel::{
    invoice_row::invoice, item_link_row::item_link, item_row::item, location_row::location,
    name_row::name, stock_line_row::stock_line,
};

table! {
    reason_option (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::reason_option_row::ReasonOptionTypeMapping,
        is_active -> Bool,
        reason -> Text,
    }
}

allow_tables_to_appear_in_same_query!(reason_option, item_link);
allow_tables_to_appear_in_same_query!(reason_option, item);
allow_tables_to_appear_in_same_query!(reason_option, location);
allow_tables_to_appear_in_same_query!(reason_option, invoice);
allow_tables_to_appear_in_same_query!(reason_option, stock_line);
allow_tables_to_appear_in_same_query!(reason_option, name);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReasonOptionType {
    #[default]
    PositiveInventoryAdjustment,
    NegativeInventoryAdjustment,
    OpenVialWastage,
    ClosedVialWastage,
    ReturnReason,
    RequisitionLineVariance,
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = reason_option)]
pub struct ReasonOptionRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: ReasonOptionType,
    pub is_active: bool,
    pub reason: String,
}

pub struct ReasonOptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReasonOptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReasonOptionRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ReasonOptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(reason_option::table)
            .values(row)
            .on_conflict(reason_option::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ReasonOptionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ReasonOptionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReasonOptionRow>, RepositoryError> {
        let result = reason_option::table
            .filter(reason_option::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ReasonOptionRow>, RepositoryError> {
        Ok(reason_option::table
            .filter(reason_option::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _mark_deleted(&self, reason_option_id: &str) -> Result<(), RepositoryError> {
        diesel::update(reason_option::table)
            .filter(reason_option::id.eq(reason_option_id))
            .set(reason_option::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn mark_deleted(&self, reason_option_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(reason_option_id)?;
        let changelog = ReasonOptionRow::generate_changelog(
            reason_option_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct ReasonOptionRowDelete(pub String);

impl Delete for ReasonOptionRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = ReasonOptionRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                ReasonOptionRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._mark_deleted(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            ReasonOptionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(ReasonOptionRow {
                is_active: false,
                ..
            })) | Ok(None)
        ));
    }
}

impl Upsert for ReasonOptionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ReasonOptionRowRepository::new(con)._upsert_one(self)?;

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
            ReasonOptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use strum::IntoEnumIterator;
    use util::assert_matches;

    use crate::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn reason_option_type_enum() {
        let (_, connection, _, _) =
            setup_all("reason_option_type_enum", MockDataInserts::none()).await;

        let repo = ReasonOptionRowRepository::new(&connection);
        // Try upsert all variants, confirm that diesel enums match postgres
        for option_type in ReasonOptionType::iter() {
            let id = format!("{option_type:?}");
            let result = repo.upsert_one(&ReasonOptionRow {
                id: id.clone(),
                r#type: option_type,
                ..Default::default()
            });
            assert_eq!(result, Ok(()));

            assert_matches!(repo.find_one_by_id(&id), Ok(Some(_)));
        }
    }
}
