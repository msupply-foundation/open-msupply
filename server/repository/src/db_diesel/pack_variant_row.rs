use super::{item_row::item, pack_variant_row::pack_variant::dsl::*};

use crate::{repository_error::RepositoryError, StorageConnection, Upsert};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    pack_variant (id) {
        id -> Text,
        item_id -> Text,
        short_name -> Text,
        long_name -> Text,
        pack_size -> Double,
        is_active -> Bool,
    }
}

joinable!(pack_variant -> item (item_id));

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    PartialOrd,
    Serialize,
    Deserialize,
)]
#[diesel(table_name = pack_variant)]
#[serde(rename_all = "camelCase")]
pub struct PackVariantRow {
    pub id: String,
    pub item_id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: f64,
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
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &PackVariantRow) -> Result<(), RepositoryError> {
        diesel::replace_into(pack_variant::dsl::pack_variant)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        variant_id: &str,
    ) -> Result<Option<PackVariantRow>, RepositoryError> {
        let result = pack_variant
            .filter(id.eq(variant_id))
            .first::<PackVariantRow>(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }
}

impl Upsert for PackVariantRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        PackVariantRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PackVariantRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
