use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};
use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    campaign(id) {
        id -> Text,
        name -> Text,
        start_date -> Nullable<Date>,
        end_date -> Nullable<Date>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = campaign)]
#[diesel(treat_none_as_null = true)]
pub struct CampaignRow {
    pub id: String,
    pub name: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
}
pub struct CampaignRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CampaignRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CampaignRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &CampaignRow) -> Result<(), RepositoryError> {
        diesel::insert_into(campaign::table)
            .values(row)
            .on_conflict(campaign::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CampaignRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CampaignRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        campaign_id: &str,
    ) -> Result<Option<CampaignRow>, RepositoryError> {
        let result = campaign::table
            .filter(campaign::id.eq(campaign_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<CampaignRow>, RepositoryError> {
        let result = campaign::table
            .filter(campaign::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn mark_deleted(&self, campaign_id: &str) -> Result<(), RepositoryError> {
        diesel::update(campaign::table.filter(campaign::id.eq(campaign_id)))
            .set(campaign::deleted_datetime.eq(chrono::Utc::now().naive_utc()))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = CampaignRow::generate_changelog(
            campaign_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for CampaignRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CampaignRowRepository::new(con)._upsert_one(self)?;
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
            CampaignRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
