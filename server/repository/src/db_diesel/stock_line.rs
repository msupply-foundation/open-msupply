use super::{
    barcode_row::barcode,
    item_link_row::item_link,
    item_row::item,
    item_variant::item_variant_row::{item_variant, ItemVariantRow},
    location_row::location,
    name_link_row::name_link,
    name_row::name,
    stock_line_row::stock_line,
    vvm_status::vvm_status_row::{vvm_status, VVMStatusRow},
    DBType, LocationRow, MasterListFilter, MasterListLineFilter, StockLineRow, StorageConnection,
};

use crate::{
    diesel_extensions::OrderByExtensions,
    diesel_macros::{
        apply_date_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_last,
        apply_sort_no_case,
    },
    location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
    BarcodeRow, DateFilter, EqualFilter, ItemFilter, ItemLinkRow, ItemRepository, ItemRow,
    MasterListLineRepository, NameLinkRow, NameRow, Pagination, Sort, StringFilter,
};

use diesel::{
    dsl::{Eq, InnerJoin, IntoBoxed, LeftJoin, LeftJoinOn, Nullable},
    prelude::*,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct StockLine {
    pub stock_line_row: StockLineRow,
    pub item_row: ItemRow,
    pub location_row: Option<LocationRow>,
    pub supplier_name_row: Option<NameRow>,
    pub barcode_row: Option<BarcodeRow>,
    pub item_variant_row: Option<ItemVariantRow>,
    pub vvm_status_row: Option<VVMStatusRow>,
}

pub enum StockLineSortField {
    ExpiryDate,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    PackSize,
    SupplierName,
    LocationCode,
    VvmStatusThenExpiry,
}

#[derive(Debug, Clone, Default)]
pub struct StockLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_code_or_name: Option<StringFilter>,
    pub item_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub is_available: Option<bool>,
    pub expiry_date: Option<DateFilter>,
    pub store_id: Option<EqualFilter<String>>,
    pub has_packs_in_store: Option<bool>,
    pub location: Option<LocationFilter>,
    pub master_list: Option<MasterListFilter>,
    pub is_active: Option<bool>,
}

pub type StockLineSort = Sort<StockLineSortField>;

type StockLineJoin = (
    StockLineRow,
    (ItemLinkRow, ItemRow),
    Option<ItemVariantRow>,
    Option<LocationRow>,
    Option<(NameLinkRow, NameRow)>,
    Option<BarcodeRow>,
    Option<VVMStatusRow>,
);
pub struct StockLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<StockLineFilter>,
        store_id: Option<String>,
    ) -> Result<i64, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockLineFilter,
        store_id: Option<String>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None, store_id)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockLineFilter>,
        sort: Option<StockLineSort>,
        store_id: Option<String>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());

        if let Some(sort) = sort {
            match sort.key {
                StockLineSortField::NumberOfPacks => {
                    apply_sort!(query, sort, stock_line::total_number_of_packs);
                }
                StockLineSortField::ExpiryDate => {
                    // TODO: would prefer to have extra parameter on Sort.nulls_last
                    apply_sort_asc_nulls_last!(query, sort, stock_line::expiry_date);
                }
                StockLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code);
                }
                StockLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                StockLineSortField::Batch => {
                    apply_sort_no_case!(query, sort, stock_line::batch);
                }
                StockLineSortField::PackSize => {
                    apply_sort!(query, sort, stock_line::pack_size);
                }
                StockLineSortField::SupplierName => {
                    apply_sort_no_case!(query, sort, name::name_);
                }
                StockLineSortField::LocationCode => {
                    apply_sort_no_case!(query, sort, location::code);
                }
                StockLineSortField::VvmStatusThenExpiry => {
                    // Complex sort, not using apply_sort
                    query = match sort.desc {
                        Some(true) => query
                            .order(vvm_status::level.desc_nulls_first())
                            .then_order_by(stock_line::expiry_date.desc_nulls_first()),
                        _ => query
                            // VVM level 1 should be before level 2, then oldest expiry first
                            .order(vvm_status::level.asc_nulls_last())
                            .then_order_by(stock_line::expiry_date.asc_nulls_last()),
                    };
                }
            }
        } else {
            query = query.order(stock_line::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<StockLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedStockLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<
            LeftJoinOn<
                LeftJoin<
                    LeftJoin<
                        InnerJoin<stock_line::table, InnerJoin<item_link::table, item::table>>,
                        item_variant::table,
                    >,
                    location::table,
                >,
                InnerJoin<name_link::table, name::table>,
                Eq<stock_line::supplier_link_id, Nullable<name_link::id>>,
            >,
            barcode::table,
        >,
        vvm_status::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<StockLineFilter>) -> BoxedStockLineQuery {
    let mut query = stock_line::table
        .inner_join(item_link::table.inner_join(item::table))
        .left_join(item_variant::table)
        .left_join(location::table)
        .left_join(
            name_link::table
                .on(stock_line::supplier_link_id.eq(name_link::id.nullable()))
                .inner_join(name::table),
        )
        .left_join(barcode::table)
        .left_join(vvm_status::table)
        .into_boxed();

    if let Some(f) = filter {
        let StockLineFilter {
            expiry_date,
            id,
            is_available,
            item_code_or_name: _,
            item_id,
            location_id,
            store_id,
            has_packs_in_store,
            location,
            master_list,
            is_active,
        } = f;

        apply_equal_filter!(query, id, stock_line::id);
        apply_equal_filter!(query, item_id, item::id);
        apply_equal_filter!(query, location_id, stock_line::location_id);
        apply_date_filter!(query, expiry_date, stock_line::expiry_date);
        apply_equal_filter!(query, store_id, stock_line::store_id);

        if let Some(is_active) = is_active {
            query = query.filter(item::is_active.eq(is_active));
        }

        query = match has_packs_in_store {
            Some(true) => query.filter(stock_line::total_number_of_packs.gt(0.0)),
            Some(false) => query.filter(stock_line::total_number_of_packs.le(0.0)),
            None => query,
        };

        query = match is_available {
            Some(true) => query.filter(stock_line::available_number_of_packs.gt(0.0)),
            Some(false) => query.filter(stock_line::available_number_of_packs.le(0.0)),
            None => query,
        };

        if location.is_some() {
            let location_ids =
                LocationRepository::create_filtered_query(location).select(location::id.nullable());
            query = query.filter(stock_line::location_id.eq_any(location_ids));
        }

        if master_list.is_some() {
            let item_ids = MasterListLineRepository::create_filtered_query(Some(
                MasterListLineFilter::new().master_list(master_list.unwrap()),
            ))
            .unwrap()
            .select(item::id);

            query = query.filter(item::id.eq_any(item_ids));
        }
    }

    query
}

fn apply_item_filter(
    query: BoxedStockLineQuery,
    filter: Option<StockLineFilter>,
    connection: &StorageConnection,
    store_id: String,
) -> BoxedStockLineQuery {
    if let Some(f) = filter {
        if let Some(item_code_or_name) = &f.item_code_or_name {
            let mut item_filter = ItemFilter::new();
            item_filter.code_or_name = Some(item_code_or_name.clone());
            item_filter.is_visible = Some(true);
            item_filter.is_active = Some(true);
            let items = ItemRepository::new(connection)
                .query_by_filter(item_filter, Some(store_id))
                .unwrap_or_default(); // if there is a database issue, allow the filter to fail silently
            let item_ids: Vec<String> = items.into_iter().map(|item| item.item_row.id).collect();

            return query.filter(item::id.eq_any(item_ids));
        }
    }
    query
}

fn to_domain(
    (
        stock_line_row,
        (_, item_row),
        item_variant_row,
        location_row,
        name_link_join,
        barcode_row,
        vvm_status_row,
    ): StockLineJoin,
) -> StockLine {
    StockLine {
        stock_line_row,
        item_row,
        location_row,
        supplier_name_row: name_link_join.map(|(_, name_row)| name_row),
        barcode_row,
        item_variant_row,
        vvm_status_row,
    }
}

impl StockLineFilter {
    pub fn new() -> StockLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }

    pub fn expiry_date(mut self, filter: DateFilter) -> Self {
        self.expiry_date = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn is_available(mut self, filter: bool) -> Self {
        self.is_available = Some(filter);
        self
    }

    pub fn has_packs_in_store(mut self, filter: bool) -> Self {
        self.has_packs_in_store = Some(filter);
        self
    }

    pub fn location(mut self, filter: LocationFilter) -> Self {
        self.location = Some(filter);
        self
    }

    pub fn master_list(mut self, filter: MasterListFilter) -> Self {
        self.master_list = Some(filter);
        self
    }
}

impl StockLine {
    pub fn location_name(&self) -> Option<&str> {
        self.location_row
            .as_ref()
            .map(|location_row| location_row.name.as_str())
    }

    pub fn available_quantity(&self) -> f64 {
        self.stock_line_row.available_number_of_packs * self.stock_line_row.pack_size
    }

    pub fn supplier_name(&self) -> Option<&str> {
        self.supplier_name_row
            .as_ref()
            .map(|name_row| name_row.name.as_str())
    }

    pub fn barcode(&self) -> Option<&str> {
        self.barcode_row
            .as_ref()
            .map(|barcode_row| barcode_row.gtin.as_str())
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use util::inline_init;

    use crate::{
        mock::MockDataInserts,
        mock::{mock_item_a, mock_store_a, MockData},
        test_db, ItemRow, Pagination, StockLine, StockLineFilter, StockLineRepository,
        StockLineRow, StockLineSort, StockLineSortField,
    };

    fn from_row(stock_line_row: StockLineRow, item_row: ItemRow) -> StockLine {
        inline_init(|r: &mut StockLine| {
            r.stock_line_row = stock_line_row;
            r.item_row = item_row;
        })
    }

    #[actix_rt::test]
    async fn test_stock_line_sort() {
        // expiry one
        fn line1() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line1".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap());
            })
        }
        // expiry two
        fn line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 2, 1).unwrap());
            })
        }
        // expiry one (expiry null)
        fn line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.expiry_date = None;
            })
        }

        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_stock_line_sort",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                // make sure to insert in wrong order
                r.stock_lines = vec![line3(), line2(), line1()];
            }),
        )
        .await;

        let repo = StockLineRepository::new(&connection);
        // Asc by expiry date
        let sort = StockLineSort {
            key: StockLineSortField::ExpiryDate,
            desc: Some(false),
        };
        // Make sure NULLS are last
        assert_eq!(
            vec![
                from_row(line1(), mock_item_a()),
                from_row(line2(), mock_item_a()),
                from_row(line3(), mock_item_a())
            ],
            repo.query(Pagination::new(), None, Some(sort), Some(mock_store_a().id))
                .unwrap()
        );
        // Desc by expiry date
        let sort = StockLineSort {
            key: StockLineSortField::ExpiryDate,
            desc: Some(true),
        };
        // Make sure NULLS are first
        assert_eq!(
            vec![
                from_row(line3(), mock_item_a()),
                from_row(line2(), mock_item_a()),
                from_row(line1(), mock_item_a())
            ],
            repo.query(Pagination::new(), None, Some(sort), Some(mock_store_a().id))
                .unwrap()
        );
    }

    #[actix_rt::test]
    async fn test_stock_line_is_available() {
        // Stock not available
        fn line1() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line1".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap());
                r.available_number_of_packs = 0.0;
            })
        }

        // Stock available
        fn line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 2, 1).unwrap());
                r.available_number_of_packs = 1.0;
            })
        }

        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_stock_line_is_available",
            MockDataInserts::none().stores().items().names().units(),
            inline_init(|r: &mut MockData| {
                r.stock_lines = vec![line1(), line2()];
            }),
        )
        .await;

        let repo = StockLineRepository::new(&connection);

        // Stock not available
        assert_eq!(
            vec![from_row(line1(), mock_item_a())],
            repo.query(
                Pagination::new(),
                Some(StockLineFilter::new().is_available(false)),
                None,
                Some(mock_store_a().id)
            )
            .unwrap()
        );

        // Stock available
        assert_eq!(
            vec![from_row(line2(), mock_item_a())],
            repo.query(
                Pagination::new(),
                Some(StockLineFilter::new().is_available(true)),
                None,
                Some(mock_store_a().id)
            )
            .unwrap()
        );
    }
}
