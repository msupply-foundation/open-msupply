use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
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

    pub fn upsert_one(&self, row: &CampaignRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(campaign::table)
            .values(row)
            .on_conflict(campaign::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Campaign,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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

    pub fn mark_deleted(&self, campaign_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(campaign::table.filter(campaign::id.eq(campaign_id)))
            .set(campaign::deleted_datetime.eq(chrono::Utc::now().naive_utc()))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        self.insert_changelog(campaign_id.to_string(), RowActionType::Upsert)
    }
}

impl Upsert for CampaignRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = CampaignRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CampaignRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
