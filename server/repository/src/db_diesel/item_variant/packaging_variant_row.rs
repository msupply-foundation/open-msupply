use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_batch_table! {
    struct: PackagingVariantRow,
    repo: PackagingVariantRowRepository,
    table: packaging_variant(id) {
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

    pub(crate) fn _upsert_one(&self, row: &PackagingVariantRow) -> Result<(), RepositoryError> {
        diesel::insert_into(packaging_variant::table)
            .values(row)
            .on_conflict(packaging_variant::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PackagingVariantRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PackagingVariantRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        packaging_variant_id: &str,
    ) -> Result<Option<PackagingVariantRow>, RepositoryError> {
        let result = packaging_variant::table
            .filter(packaging_variant::id.eq(packaging_variant_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, packaging_variant_id: &str) -> Result<(), RepositoryError> {
        diesel::update(
            packaging_variant::table.filter(packaging_variant::id.eq(packaging_variant_id)),
        )
        .set(packaging_variant::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
        .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = PackagingVariantRow::generate_changelog(
            packaging_variant_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PackagingVariantRow>, RepositoryError> {
        Ok(packaging_variant::table
            .filter(packaging_variant::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
