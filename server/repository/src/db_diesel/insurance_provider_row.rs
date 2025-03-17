use super::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
  insurance_provider (id) {
      id -> Text,
      provider_name -> Text,
      is_active -> Bool,
      prescription_validity_days -> Nullable<Integer>,
      comment -> Nullable<Text>,
  }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(table_name = insurance_provider)]
pub struct InsuranceProviderRow {
    pub id: String,
    pub provider_name: String,
    pub is_active: bool,
    pub prescription_validity_days: Option<i32>,
    pub comment: Option<String>,
}

pub struct InsuranceProviderRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InsuranceProviderRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InsuranceProviderRowRepository { connection }
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<InsuranceProviderRow>, RepositoryError> {
        let result = insurance_provider::table
            .filter(insurance_provider::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        insurance_provider::table
            .filter(insurance_provider::id.eq_any(ids))
            .load::<InsuranceProviderRow>(self.connection.lock().connection())
            .map_err(RepositoryError::from)
    }

    pub fn find_all(&self) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        let result = insurance_provider::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &InsuranceProviderRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(insurance_provider::table)
            .values(row)
            .on_conflict(insurance_provider::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::InsuranceProvider,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

impl Upsert for InsuranceProviderRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = InsuranceProviderRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            InsuranceProviderRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
