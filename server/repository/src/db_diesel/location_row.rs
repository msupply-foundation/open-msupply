use super::{
    assets::asset_internal_location_row::asset_internal_location, item_link_row::item_link,
    location_row::location::dsl as location_dsl, name_link_row::name_link, store_row::store,
    RepositoryError, StorageConnection,
};
use crate::{Delete, Upsert};
use diesel::prelude::*;

table! {
    location (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        on_hold -> Bool,
        store_id -> Text,
    }
}

joinable!(location -> store (store_id));
allow_tables_to_appear_in_same_query!(location, item_link);
allow_tables_to_appear_in_same_query!(location, name_link);
allow_tables_to_appear_in_same_query!(location, asset_internal_location);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = location)]
pub struct LocationRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub on_hold: bool,
    pub store_id: String,
}

pub struct LocationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &LocationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_dsl::location)
            .values(row)
            .on_conflict(location_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationRow>, RepositoryError> {
        match location_dsl::location
            .filter(location_dsl::id.eq(id))
            .first(self.connection.lock().connection())
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<LocationRow>, RepositoryError> {
        Ok(location_dsl::location
            .filter(location_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(location_dsl::location.filter(location_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
// Only used in tests
pub struct LocationRowDelete(pub String);
impl Delete for LocationRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        LocationRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for LocationRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        LocationRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
