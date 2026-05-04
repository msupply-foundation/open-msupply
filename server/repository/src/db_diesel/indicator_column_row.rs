use super::{IndicatorValueType, StorageConnection};
use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};
use diesel::prelude::*;

table! {
    indicator_column (id) {
        id -> Text,
        program_indicator_id -> Text,
        column_number -> Integer,
        header ->Text,
        value_type -> Nullable<crate::IndicatorValueTypeMapping>,
        default_value -> Text,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = indicator_column)]
pub struct IndicatorColumnRow {
    pub id: String,
    pub program_indicator_id: String,
    pub column_number: i32,
    pub header: String,
    pub value_type: Option<IndicatorValueType>,
    pub default_value: String,
    pub is_active: bool,
}

pub struct IndicatorColumnRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorColumnRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorColumnRowRepository { connection }
    }

    fn _upsert_one(&self, row: &IndicatorColumnRow) -> Result<(), RepositoryError> {
        let query = diesel::insert_into(indicator_column::table)
            .values(row)
            .on_conflict(indicator_column::id)
            .do_update()
            .set(row);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        query.execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &IndicatorColumnRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = IndicatorColumnRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<IndicatorColumnRow>, RepositoryError> {
        let result = indicator_column::table
            .filter(indicator_column::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<IndicatorColumnRow>, RepositoryError> {
        Ok(indicator_column::table
            .filter(indicator_column::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_indicator_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<IndicatorColumnRow>, RepositoryError> {
        let result = indicator_column::table
            .filter(indicator_column::program_indicator_id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}
impl Upsert for IndicatorColumnRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        IndicatorColumnRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorColumnRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
