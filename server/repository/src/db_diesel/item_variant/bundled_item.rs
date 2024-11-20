use super::bundled_item_row::{bundled_item, BundledItemRow};
use crate::{
    diesel_macros::{apply_equal_filter, apply_equal_or_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, StorageConnection,
};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default)]
pub struct BundledItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub principal_item_variant_id: Option<EqualFilter<String>>,
    pub bundled_item_variant_id: Option<EqualFilter<String>>,
    pub principal_or_bundled_variant_id: Option<String>,
}

impl BundledItemFilter {
    pub fn new() -> BundledItemFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn principal_item_variant_id(mut self, filter: EqualFilter<String>) -> Self {
        self.principal_item_variant_id = Some(filter);
        self
    }
    pub fn bundled_item_variant_id(mut self, filter: EqualFilter<String>) -> Self {
        self.bundled_item_variant_id = Some(filter);
        self
    }
    pub fn principal_or_bundled_variant_id(mut self, id: String) -> Self {
        self.principal_or_bundled_variant_id = Some(id);
        self
    }
}

pub struct BundledItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BundledItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BundledItemRepository { connection }
    }

    pub fn count(&self, filter: Option<BundledItemFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: BundledItemFilter,
    ) -> Result<Option<BundledItemRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: BundledItemFilter,
    ) -> Result<Vec<BundledItemRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<BundledItemFilter>,
    ) -> Result<Vec<BundledItemRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<BundledItemRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedBundledItemQuery = IntoBoxed<'static, bundled_item::table, DBType>;

fn create_filtered_query(filter: Option<BundledItemFilter>) -> BoxedBundledItemQuery {
    let mut query = bundled_item::table.into_boxed();

    // Exclude any deleted items
    query = query.filter(bundled_item::deleted_datetime.is_null());

    if let Some(f) = filter {
        let BundledItemFilter {
            id,
            principal_item_variant_id,
            bundled_item_variant_id,
            principal_or_bundled_variant_id,
        } = f;

        if let Some(record_id) = principal_or_bundled_variant_id {
            query = query.filter(
                bundled_item::principal_item_variant_id
                    .eq(record_id.clone())
                    .or(bundled_item::bundled_item_variant_id.eq(record_id)),
            );
        }

        apply_equal_filter!(query, id, bundled_item::id);
        apply_equal_filter!(
            query,
            principal_item_variant_id,
            bundled_item::principal_item_variant_id
        );
        apply_equal_filter!(
            query,
            bundled_item_variant_id,
            bundled_item::bundled_item_variant_id
        );
    }

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        item_variant::{
            bundled_item::BundledItemRepository,
            bundled_item_row::{BundledItemRow, BundledItemRowRepository},
            item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
        },
        mock::{mock_item_a, mock_item_b, MockDataInserts},
        test_db, EqualFilter,
    };

    use super::BundledItemFilter;

    #[actix_rt::test]
    async fn test_bundled_item_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_bundled_item_query_repository",
            MockDataInserts::none().items(),
        )
        .await;

        let id = "test_id".to_string();
        let principal_id = "principal_id".to_string();
        let bundled_id = "bundled_id".to_string();

        let item_variant_repo = ItemVariantRowRepository::new(&storage_connection);

        item_variant_repo
            .upsert_one(&ItemVariantRow {
                id: principal_id.clone(),
                item_link_id: mock_item_a().id,
                ..Default::default()
            })
            .unwrap();
        item_variant_repo
            .upsert_one(&ItemVariantRow {
                id: bundled_id.clone(),
                item_link_id: mock_item_b().id,
                ..Default::default()
            })
            .unwrap();

        // Insert a row
        let _bundled_item_row = BundledItemRowRepository::new(&storage_connection)
            .upsert_one(&BundledItemRow {
                id: id.clone(),
                principal_item_variant_id: principal_id.clone(),
                bundled_item_variant_id: bundled_id,
                ratio: 1.0,
                deleted_datetime: None,
            })
            .unwrap();

        // Query by id
        let bundled_item_row = BundledItemRepository::new(&storage_connection)
            .query_one(BundledItemFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap();
        assert_eq!(bundled_item_row.id, id);

        // Query by name
        let bundled_item_row = BundledItemRepository::new(&storage_connection)
            .query_one(
                BundledItemFilter::new()
                    .principal_item_variant_id(EqualFilter::equal_to(&principal_id)),
            )
            .unwrap()
            .unwrap();
        assert_eq!(bundled_item_row.id, id);

        // Query by principal or bundled variant id
        let bundled_item_row = BundledItemRepository::new(&storage_connection)
            .query_one(BundledItemFilter::new().principal_or_bundled_variant_id(principal_id))
            .unwrap()
            .unwrap();
        assert_eq!(bundled_item_row.id, id);
    }
}
