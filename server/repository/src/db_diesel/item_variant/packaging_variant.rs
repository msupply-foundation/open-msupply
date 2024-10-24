use super::packaging_variant_row::{packaging_variant, PackagingVariantRow};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub enum PackagingVariantSortField {
    Name,
}

pub type PackagingVariantSort = Sort<PackagingVariantSortField>;

#[derive(Clone, Default)]
pub struct PackagingVariantFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

impl PackagingVariantFilter {
    pub fn new() -> PackagingVariantFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }
}

pub struct PackagingVariantRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PackagingVariantRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PackagingVariantRepository { connection }
    }

    pub fn count(&self, filter: Option<PackagingVariantFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: PackagingVariantFilter,
    ) -> Result<Option<PackagingVariantRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: PackagingVariantFilter,
    ) -> Result<Vec<PackagingVariantRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PackagingVariantFilter>,
        sort: Option<PackagingVariantSort>,
    ) -> Result<Vec<PackagingVariantRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                PackagingVariantSortField::Name => {
                    apply_sort_no_case!(query, sort, packaging_variant::name);
                }
            }
        } else {
            query = query.order(packaging_variant::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<PackagingVariantRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(packaging_variant_row: PackagingVariantRow) -> PackagingVariantRow {
    packaging_variant_row
}

type BoxedPackagingVariantQuery = IntoBoxed<'static, packaging_variant::table, DBType>;

fn create_filtered_query(filter: Option<PackagingVariantFilter>) -> BoxedPackagingVariantQuery {
    let mut query = packaging_variant::table.into_boxed();
    // Exclude any deleted items
    query = query.filter(packaging_variant::deleted_datetime.is_null());

    if let Some(f) = filter {
        let PackagingVariantFilter { id, name } = f;

        apply_equal_filter!(query, id, packaging_variant::id);
        apply_string_filter!(query, name, packaging_variant::name);
    }
    query
}

#[cfg(test)]
mod tests {
    use crate::{
        item_variant::{
            item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
            packaging_variant::PackagingVariantRepository,
            packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
        },
        mock::{mock_item_a, MockDataInserts},
        test_db, EqualFilter, StringFilter,
    };

    use super::PackagingVariantFilter;

    #[actix_rt::test]
    async fn test_packaging_variant_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_packaging_variant_query_repository",
            MockDataInserts::none().items(),
        )
        .await;

        let item_variant_id = "item_variant_id".to_string();
        let packaging_variant_id = "packaging_variant_id".to_string();
        let name = "test_name".to_string();

        // Insert an item variant, and packaging_variant row
        let _item_variant_row = ItemVariantRowRepository::new(&storage_connection)
            .upsert_one(&ItemVariantRow {
                id: item_variant_id.clone(),
                name: name.clone(),
                item_link_id: mock_item_a().id,
                cold_storage_type_id: None,
                doses_per_unit: Some(10),
                manufacturer_link_id: None,
                deleted_datetime: None,
            })
            .unwrap();

        let _packaging_variant_row = PackagingVariantRowRepository::new(&storage_connection)
            .upsert_one(&PackagingVariantRow {
                id: packaging_variant_id.clone(),
                name: name.clone(),
                item_variant_id: item_variant_id.clone(),
                packaging_level: 1,
                pack_size: Some(1.0),
                volume_per_unit: Some(0.015),
                deleted_datetime: None,
            })
            .unwrap();

        // Query by id
        let packaging_variant = PackagingVariantRepository::new(&storage_connection)
            .query_one(
                PackagingVariantFilter::new().id(EqualFilter::equal_to(&packaging_variant_id)),
            )
            .unwrap()
            .unwrap();
        assert_eq!(packaging_variant.id, packaging_variant_id);
        assert_eq!(packaging_variant.name, name);

        // Query by name
        let packaging_variant = PackagingVariantRepository::new(&storage_connection)
            .query_one(PackagingVariantFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();
        assert_eq!(packaging_variant.id, packaging_variant_id);
        assert_eq!(packaging_variant.name, name);
    }
}
