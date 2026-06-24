use super::{
    name_row::name, ChangelogRepository, RowActionType,
    StorageConnection,
};
use crate::SourceSiteId;
use crate::{diesel_macros::define_linked_tables, repository_error::RepositoryError};
use diesel::prelude::*;

define_linked_tables! {
    view: indicator_value = "indicator_value_view",
    core: indicator_value_with_links = "indicator_value",
    struct: IndicatorValueRow,
    repo: IndicatorValueRowRepository,
    shared: {
        store_id -> Text,
        period_id -> Text,
        indicator_line_id -> Text,
        indicator_column_id -> Text,
        value -> Text,
    },
    links: {
        customer_name_link_id -> customer_name_id,
    },
    optional_links: {
    }
}

joinable!(indicator_value -> name (customer_name_id));
allow_tables_to_appear_in_same_query!(indicator_value, name);

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = indicator_value)]
pub struct IndicatorValueRow {
    pub id: String,
    pub store_id: String,
    pub period_id: String,
    pub indicator_line_id: String,
    pub indicator_column_id: String,
    pub value: String,
    // Resolved from name_link - must be last to match view column order
    pub customer_name_id: String,
}
pub struct IndicatorValueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorValueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorValueRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &IndicatorValueRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let row = self
            .find_one_by_id(id)?
            .ok_or(RepositoryError::NotFound)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(
            indicator_value_with_links::table.filter(indicator_value_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(
            indicator_value_with_links::table.filter(indicator_value_with_links::id.eq_any(ids)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
        Ok(indicator_value::table
            .filter(indicator_value::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
