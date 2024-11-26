use super::{om_report_row::om_report::dsl as om_report_dsl, StorageConnection};

use crate::repository_error::RepositoryError;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
  om_report (id) {
      id -> Text,
      data -> Text
  }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(table_name = om_report)]
pub struct OmReportRow {
    pub id: String,
    pub data: String,
}

pub struct OmReportRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> OmReportRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        OmReportRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<OmReportRow>, RepositoryError> {
        let result = om_report_dsl::om_report
            .filter(om_report_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &OmReportRow) -> Result<(), RepositoryError> {
        diesel::insert_into(om_report_dsl::om_report)
            .values(row)
            .on_conflict(om_report_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(om_report_dsl::om_report.filter(om_report_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
