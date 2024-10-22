use super::packaging_variant_row::packaging_variant::dsl as packaging_variant_dsl;

use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    packaging_variant(id) {
        id -> Text,
        name -> Text,
        item_variant_id -> Text,
        packaging_level -> Integer,
        pack_size -> Nullable<Double>,
        volume_per_unit -> Nullable<Double>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = packaging_variant)]
pub struct PackagingVariantRow {
    pub id: String,
    pub name: String,
    pub item_variant_id: String,
    pub packaging_level: i32,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
}

pub struct PackagingVariantRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PackagingVariantRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PackagingVariantRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PackagingVariantRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(packaging_variant_dsl::packaging_variant)
            .values(row)
            .on_conflict(packaging_variant_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PackagingVariant,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        packaging_variant_id: &str,
    ) -> Result<Option<PackagingVariantRow>, RepositoryError> {
        let result = packaging_variant_dsl::packaging_variant
            .filter(packaging_variant_dsl::id.eq(packaging_variant_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for PackagingVariantRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PackagingVariantRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PackagingVariantRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
