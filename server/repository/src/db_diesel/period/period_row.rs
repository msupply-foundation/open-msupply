use super::period_row::period::dsl::*;

use crate::{
    db_diesel::name_link_row::name_link, period_schedule_row::period_schedule,
    repository_error::RepositoryError, StorageConnection, Upsert,
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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = period)]
pub struct PeriodRow {
    pub id: String,
    pub period_schedule_id: String,
    pub name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

joinable!(period -> period_schedule (period_schedule_id));

allow_tables_to_appear_in_same_query!(period, name_link);
allow_tables_to_appear_in_same_query!(period, period_schedule);

pub struct PeriodRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PeriodRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PeriodRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PeriodRow) -> Result<(), RepositoryError> {
        diesel::insert_into(period)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, period_id: &str) -> Result<Option<PeriodRow>, RepositoryError> {
        let result = period
            .filter(id.eq(period_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
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
}

impl Upsert for PeriodRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        PeriodRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PeriodRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
