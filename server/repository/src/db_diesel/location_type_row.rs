use super::StorageConnection;

use crate::{
    ChangelogSyncType, ChangelogTableName, Delete, RowActionType, SourceSiteId, Upsert,
    db_diesel::changelog::ChangelogRepository, repository_error::RepositoryError, trim,
};

use diesel::prelude::*;

table! {
    location_type (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
        code -> Text,
    }
}

/// A kind of record that can refer to a location type.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LocationTypeUser {
    Location,
    Item,
    ItemVariant,
    RequisitionLine,
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(table_name = location_type)]
pub struct LocationTypeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
    #[serde(default)]
    pub code: String,
}

impl LocationTypeRow {
    pub fn table_name() -> ChangelogTableName {
        ChangelogTableName::LocationType
    }
    pub fn record_id(&self) -> String {
        self.id.clone()
    }
}

pub struct LocationTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationTypeRowRepository { connection }
    }

    fn _upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_type::table)
            .values(row)
            .on_conflict(location_type::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = LocationTypeRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .filter(location_type::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, lookup_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            location_type::table.filter(location_type::id.eq(lookup_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    /// Whether a location type OTHER than `excluding_id` already carries `code`.
    /// Nothing in the schema enforces uniqueness; the code is derived from the
    /// name, so two same-named types would otherwise collide.
    pub fn code_is_taken(&self, code: &str, excluding_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            location_type::table
                .filter(location_type::code.eq(code))
                .filter(location_type::id.ne(excluding_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    /// Letter case counts; spaces around either code don't.
    pub fn find_by_trimmed_code(
        &self,
        code: &str,
    ) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .filter(trim(location_type::code).eq(code.trim()))
            .order(location_type::id.asc())
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .filter(location_type::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_all(&self) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        let result = location_type::table
            .order((location_type::code.asc(), location_type::id.asc()))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// The first kind of record whose foreign key refers to it, if any.
    pub fn used_by(&self, lookup_id: &str) -> Result<Option<LocationTypeUser>, RepositoryError> {
        use super::{
            item_row::item, item_variant::item_variant_row::item_variant, location_row::location,
            requisition_line::requisition_line_row::requisition_line,
        };
        use diesel::dsl::exists;
        let mut guard = self.connection.lock();
        let connection = guard.connection();
        if diesel::select(exists(
            location::table.filter(location::location_type_id.eq(lookup_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(LocationTypeUser::Location));
        }
        if diesel::select(exists(
            item::table.filter(item::restricted_location_type_id.eq(lookup_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(LocationTypeUser::Item));
        }
        if diesel::select(exists(
            item_variant::table.filter(item_variant::location_type_id.eq(lookup_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(LocationTypeUser::ItemVariant));
        }
        if diesel::select(exists(
            requisition_line::table.filter(requisition_line::location_type_id.eq(lookup_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(LocationTypeUser::RequisitionLine));
        }
        Ok(None)
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_type::table.filter(location_type::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        self._delete(id)?;
        let changelog = LocationTypeRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct LocationTypeRowDelete(pub String);
impl Delete for LocationTypeRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                LocationTypeRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        LocationTypeRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for LocationTypeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        LocationTypeRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                LocationTypeRow::generate_changelog(
                    self.id.clone(),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
