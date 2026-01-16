use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    location_type (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = location_type)]
pub struct LocationTypeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
}

use crate::syncv7::*;

crate::impl_record! {
    struct: LocationTypeRow,
    table: location_type,
    id_field: id
}

crate::impl_central_sync_record!(LocationTypeRow, crate::ChangelogTableName::LocationType);

pub(crate) struct Translator;

impl TranslatorTrait for Translator {
    type Item = LocationTypeRow;
}

impl Translator {
    // Needs to be added to translators() in ..
    #[deny(dead_code)]
    pub(crate) fn boxed() -> Box<dyn BoxableSyncRecord> {
        Box::new(Self)
    }
}

pub struct LocationTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationTypeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &LocationTypeRow) -> Result<(), RepositoryError> {
        row.upsert_internal(&self.connection)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        LocationTypeRow::find_by_id(self.connection, id)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_type::table.filter(location_type::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for LocationTypeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        LocationTypeRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
