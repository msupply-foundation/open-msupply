use super::StorageConnection;

use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    demographic(id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = demographic)]
pub struct DemographicRow {
    pub id: String,
    pub name: String,
}

pub struct DemographicRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &DemographicRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(demographic::table)
            .values(row)
            .on_conflict(demographic::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Demographic,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        demographic_id: &str,
    ) -> Result<Option<DemographicRow>, RepositoryError> {
        let result = demographic::table
            .filter(demographic::id.eq(demographic_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name(
        &self,
        demographic_name: &str,
    ) -> Result<Option<DemographicRow>, RepositoryError> {
        let result = demographic::table
            .filter(demographic::name.eq(demographic_name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for DemographicRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = DemographicRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DemographicRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
