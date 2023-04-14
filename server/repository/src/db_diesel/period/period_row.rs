use super::period_row::period::dsl as period_dsl;

use crate::{repository_error::RepositoryError, StorageConnection};

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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "period"]
pub struct PeriodRow {
    pub id: String,
    pub period_schedule_id: String,
    pub name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

pub struct PeriodRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PeriodRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PeriodRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &PeriodRow) -> Result<(), RepositoryError> {
        diesel::insert_into(period_dsl::period)
            .values(row)
            .on_conflict(period_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &PeriodRow) -> Result<(), RepositoryError> {
        diesel::replace_into(period_dsl::period)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PeriodRow>, RepositoryError> {
        let result = period_dsl::period
            .filter(period_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
