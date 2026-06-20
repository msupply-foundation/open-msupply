use super::period_row::period::dsl::*;

use crate::{
    period_schedule_row::period_schedule, repository_error::RepositoryError, ChangelogRepository,
    RowActionType, SourceSiteId, StorageConnection,
};

use chrono::NaiveDate;
use diesel::prelude::*;

table! {
    period (id) {
        id -> Text,
        period_schedule_id -> Text,
        name -> Text,
        start_date -> Date,
        end_date -> Date,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = period)]
pub struct PeriodRow {
    pub id: String,
    pub period_schedule_id: String,
    pub name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

joinable!(period -> period_schedule (period_schedule_id));

allow_tables_to_appear_in_same_query!(period, period_schedule);

pub struct PeriodRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PeriodRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PeriodRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &PeriodRow) -> Result<(), RepositoryError> {
        diesel::insert_into(period)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PeriodRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PeriodRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, period_id: &str) -> Result<Option<PeriodRow>, RepositoryError> {
        let result = period
            .filter(id.eq(period_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PeriodRow>, RepositoryError> {
        Ok(period
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_program_schedule_ids(
        &self,
        period_schedule_ids: Vec<&str>,
    ) -> Result<Vec<PeriodRow>, RepositoryError> {
        let result = period
            .filter(period_schedule_id.eq_any(period_schedule_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, lookup_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            period::table.filter(period::id.eq(lookup_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }
}
