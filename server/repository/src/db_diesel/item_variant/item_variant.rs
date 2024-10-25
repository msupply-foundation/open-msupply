use super::item_variant_row::{item_variant, ItemVariantRow};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub enum ItemVariantSortField {
    Name,
}

pub type ItemVariantSort = Sort<ItemVariantSortField>;

#[derive(Clone, Default)]
pub struct ItemVariantFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

impl ItemVariantFilter {
    pub fn new() -> ItemVariantFilter {
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

pub struct ItemVariantRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemVariantRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemVariantRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemVariantFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ItemVariantFilter,
    ) -> Result<Option<ItemVariantRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ItemVariantFilter,
    ) -> Result<Vec<ItemVariantRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemVariantFilter>,
        sort: Option<ItemVariantSort>,
    ) -> Result<Vec<ItemVariantRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ItemVariantSortField::Name => {
                    apply_sort_no_case!(query, sort, item_variant::name);
                }
            }
        } else {
            query = query.order(item_variant::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<ItemVariantRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(item_variant_row: ItemVariantRow) -> ItemVariantRow {
    item_variant_row
}

type BoxedItemVariantQuery = IntoBoxed<'static, item_variant::table, DBType>;

fn create_filtered_query(filter: Option<ItemVariantFilter>) -> BoxedItemVariantQuery {
    let mut query = item_variant::table.into_boxed();
    // Exclude any deleted items
    query = query.filter(item_variant::deleted_datetime.is_null());

    if let Some(f) = filter {
        let ItemVariantFilter { id, name } = f;

        apply_equal_filter!(query, id, item_variant::id);
        apply_string_filter!(query, name, item_variant::name);
    }
    query
}

#[cfg(test)]
mod tests {
    use crate::{
        item_variant::{
            item_variant::ItemVariantRepository,
            item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
        },
        mock::{mock_item_a, MockDataInserts},
        test_db, EqualFilter, StringFilter,
    };

    use super::ItemVariantFilter;

    #[actix_rt::test]
    async fn test_item_variant_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_item_variant_query_repository",
            MockDataInserts::none().items(),
        )
        .await;

        let id = "test_id".to_string();
        let name = "test_name".to_string();

        // Insert a row
        let _item_variant_row = ItemVariantRowRepository::new(&storage_connection)
            .upsert_one(&ItemVariantRow {
                id: id.clone(),
                name: name.clone(),
                item_link_id: mock_item_a().id,
                cold_storage_type_id: None,
                doses_per_unit: Some(10),
                manufacturer_link_id: None,
                deleted_datetime: None,
            })
            .unwrap();

        // Query by id
        let item_variant_row = ItemVariantRepository::new(&storage_connection)
            .query_one(ItemVariantFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap();
        assert_eq!(item_variant_row.id, id);
        assert_eq!(item_variant_row.name, name);

        // Query by name
        let item_variant_row = ItemVariantRepository::new(&storage_connection)
            .query_one(ItemVariantFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();
        assert_eq!(item_variant_row.id, id);
        assert_eq!(item_variant_row.name, name);
    }
}
