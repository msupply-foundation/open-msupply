use super::{item_row::item, pack_unit_row::pack_unit::dsl::*};

use crate::{repository_error::RepositoryError, StorageConnection};

use diesel::prelude::*;

table! {
    pack_unit (id) {
        id -> Text,
        item_id -> Text,
        short_name -> Text,
        long_name -> Text,
        pack_size -> Integer,
    }
}

joinable!(pack_unit -> item (item_id));

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Eq, Ord, PartialOrd,
)]
#[table_name = "pack_unit"]
pub struct PackUnitRow {
    pub id: String,
    pub item_id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: i32,
}

pub struct PackUnitRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PackUnitRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PackUnitRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &PackUnitRow) -> Result<(), RepositoryError> {
        diesel::insert_into(pack_unit::dsl::pack_unit)
            .values(row)
            .on_conflict(pack_unit::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &PackUnitRow) -> Result<(), RepositoryError> {
        diesel::replace_into(pack_unit::dsl::pack_unit)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn load_all(&self) -> Result<Vec<PackUnitRow>, RepositoryError> {
        let result = pack_unit.load::<PackUnitRow>(&self.connection.connection)?;

        Ok(result)
    }
}
