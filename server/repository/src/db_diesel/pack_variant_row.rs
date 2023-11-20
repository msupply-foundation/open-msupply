use super::{item_row::item, pack_variant_row::pack_variant::dsl::*};

use crate::{repository_error::RepositoryError, StorageConnection};

use diesel::prelude::*;

table! {
    pack_variant (id) {
        id -> Text,
        item_id -> Text,
        short_name -> Text,
        long_name -> Text,
        pack_size -> Integer,
        is_active -> Bool,
    }
}

joinable!(pack_variant -> item (item_id));

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Eq, Ord, PartialOrd,
)]
#[table_name = "pack_variant"]
pub struct PackVariantRow {
    pub id: String,
    pub item_id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: i32,
    pub is_active: bool,
}

pub struct PackVariantRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PackVariantRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PackVariantRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &PackVariantRow) -> Result<(), RepositoryError> {
        diesel::insert_into(pack_variant::dsl::pack_variant)
            .values(row)
            .on_conflict(pack_variant::dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &PackVariantRow) -> Result<(), RepositoryError> {
        diesel::replace_into(pack_variant::dsl::pack_variant)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        variant_id: &str,
    ) -> Result<Option<PackVariantRow>, RepositoryError> {
        let result = pack_variant
            .filter(id.eq(variant_id))
            .first::<PackVariantRow>(&self.connection.connection)
            .optional()?;

        Ok(result)
    }

    pub fn load_all(&self) -> Result<Vec<PackVariantRow>, RepositoryError> {
        let result = pack_variant.load::<PackVariantRow>(&self.connection.connection)?;

        Ok(result)
    }
}
