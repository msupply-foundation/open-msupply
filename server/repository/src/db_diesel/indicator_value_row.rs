use super::{
    name_link_row::name_link, name_row::name, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, RowActionType, StorageConnection,
};
use crate::{repository_error::RepositoryError, Delete, Upsert};
use diesel::prelude::*;

table! {
    indicator_value (id) {
        id -> Text,
        customer_name_link_id -> Text,
        store_id -> Text,
        period_id -> Text,
        indicator_line_id -> Text,
        indicator_column_id -> Text,
        value -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = indicator_value)]
pub struct IndicatorValueRow {
    pub id: String,
    pub customer_name_link_id: String,
    pub store_id: String,
    pub period_id: String,
    pub indicator_line_id: String,
    pub indicator_column_id: String,
    pub value: String,
}

joinable!(indicator_value -> name_link (customer_name_link_id));
allow_tables_to_appear_in_same_query!(indicator_value, name_link);
allow_tables_to_appear_in_same_query!(indicator_value, name);

pub struct IndicatorValueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorValueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorValueRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &IndicatorValueRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(indicator_value::table)
            .values(row)
            .on_conflict(indicator_value::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row, RowActionType::Upsert)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(indicator_value::table.filter(indicator_value::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    fn insert_changelog(
        &self,
        row: &IndicatorValueRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::IndicatorValue,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<IndicatorValueRow>, RepositoryError> {
        let result = indicator_value::table
            .filter(indicator_value::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct IndicatorValueRowDelete(pub String);
impl Delete for IndicatorValueRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = IndicatorValueRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorValueRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for IndicatorValueRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = IndicatorValueRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorValueRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
