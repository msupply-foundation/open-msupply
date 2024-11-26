use super::{
    om_report_row::om_report::dsl as om_report_dsl, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};
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

    pub fn upsert_one(&self, row: &OmReportRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(om_report_dsl::om_report)
            .values(row)
            .on_conflict(om_report_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::OmReport,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(om_report_dsl::om_report.filter(om_report_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for OmReportRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = OmReportRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            OmReportRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
