use super::item_variant_row::{item_variant, ItemVariantRow};
use crate::{
    db_diesel::{cold_storage_type_row::cold_storage_type, item_row::item, name_row::name},
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    item_link, name_link,
    repository_error::RepositoryError,
    ColdStorageTypeRow, DBType, EqualFilter, ItemLinkRow, ItemRow, NameLinkRow, NameRow,
    Pagination, Sort, StorageConnection, StringFilter,
};
use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct ItemVariant {
    pub item_variant_row: ItemVariantRow,
    pub manufacturer_row: Option<NameRow>,
    pub item_row: ItemRow,
    pub cold_storage_type_row: Option<ColdStorageTypeRow>,
}

pub enum ItemVariantSortField {
    Name,
}

pub type ItemVariantSort = Sort<ItemVariantSortField>;

type ItemVariantJoin = (
    ItemVariantRow,
    Option<(NameLinkRow, NameRow)>,
    (ItemLinkRow, ItemRow),
    Option<ColdStorageTypeRow>,
);

#[derive(Clone, Default)]
pub struct ItemVariantFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub item_id: Option<EqualFilter<String>>,
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

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
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
    ) -> Result<Option<ItemVariant>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ItemVariantFilter,
    ) -> Result<Vec<ItemVariant>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemVariantFilter>,
        sort: Option<ItemVariantSort>,
    ) -> Result<Vec<ItemVariant>, RepositoryError> {
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

        let result = final_query.load::<ItemVariantJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (item_variant_row, name_link, (_, item_row), cold_storage_type_row): ItemVariantJoin,
) -> ItemVariant {
    ItemVariant {
        item_variant_row,
        manufacturer_row: name_link.map(|(_, name)| name),
        item_row,
        cold_storage_type_row,
    }
}

type BoxedItemVariantQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<
            LeftJoin<item_variant::table, InnerJoin<name_link::table, name::table>>,
            InnerJoin<item_link::table, item::table>,
        >,
        cold_storage_type::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<ItemVariantFilter>) -> BoxedItemVariantQuery {
    let mut query = item_variant::table
        .left_join(name_link::table.inner_join(name::table))
        .inner_join(item_link::table.inner_join(item::table))
        .left_join(cold_storage_type::table)
        .into_boxed();
    // Exclude any deleted items
    query = query.filter(item_variant::deleted_datetime.is_null());

    if let Some(f) = filter {
        let ItemVariantFilter { id, name, item_id } = f;

        apply_equal_filter!(query, id, item_variant::id);
        apply_string_filter!(query, name, item_variant::name);
        apply_equal_filter!(query, item_id, item::id);
    }
    query
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

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
                manufacturer_link_id: None,
                deleted_datetime: None,
                vvm_type: None,
                created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                created_by: None,
            })
            .unwrap();

        // Query by id
        let item_variant_row = ItemVariantRepository::new(&storage_connection)
            .query_one(ItemVariantFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap()
            .item_variant_row;

        assert_eq!(item_variant_row.id, id);
        assert_eq!(item_variant_row.name, name);

        // Query by name
        let item_variant_row = ItemVariantRepository::new(&storage_connection)
            .query_one(ItemVariantFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap()
            .item_variant_row;

        assert_eq!(item_variant_row.id, id);
        assert_eq!(item_variant_row.name, name);
    }
}
