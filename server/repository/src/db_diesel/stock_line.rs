use super::{
    location_row::{location, location::dsl as location_dsl},
    name_row::{name, name::dsl as name_dsl},
    stock_line_row::{stock_line, stock_line::dsl as stock_line_dsl},
    DBType, LocationRow, StockLineRow, StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_last},
    repository_error::RepositoryError,
    DateFilter, EqualFilter, ItemFilter, ItemRepository, NameRow, Pagination, SimpleStringFilter,
    Sort,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct StockLine {
    pub stock_line_row: StockLineRow,
    pub location_row: Option<LocationRow>,
    pub name_row: Option<NameRow>,
}

pub enum StockLineSortField {
    ExpiryDate,
    NumberOfPacks,
}

#[derive(Debug, Clone)]
pub struct StockLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_code_or_name: Option<SimpleStringFilter>,
    pub item_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub is_available: Option<bool>,
    pub expiry_date: Option<DateFilter>,
    pub store_id: Option<EqualFilter<String>>,
}

pub type StockLineSort = Sort<StockLineSortField>;

type StockLineJoin = (StockLineRow, Option<LocationRow>, Option<NameRow>);
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
        query = apply_item_filter(
            query,
            filter,
            &self.connection,
            store_id.unwrap_or_default(),
        );

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockLineFilter,
        store_id: Option<String>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None, store_id)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockLineFilter>,
        sort: Option<StockLineSort>,
        store_id: Option<String>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());
        query = apply_item_filter(
            query,
            filter,
            &self.connection,
            store_id.unwrap_or_default(),
        );

        if let Some(sort) = sort {
            match sort.key {
                StockLineSortField::NumberOfPacks => {
                    apply_sort!(query, sort, stock_line_dsl::total_number_of_packs);
                }
                StockLineSortField::ExpiryDate => {
                    // TODO: would prefer to have extra parameter on Sort.nulls_last
                    apply_sort_asc_nulls_last!(query, sort, stock_line_dsl::expiry_date);
                }
            }
        } else {
            query = query.order(stock_line_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<StockLineJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedStockLineQuery =
    IntoBoxed<'static, LeftJoin<LeftJoin<stock_line::table, location::table>, name::table>, DBType>;

fn create_filtered_query(filter: Option<StockLineFilter>) -> BoxedStockLineQuery {
    let mut query = stock_line_dsl::stock_line
        .left_join(location_dsl::location)
        .left_join(name_dsl::name)
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
        } = f;

        apply_equal_filter!(query, id, stock_line_dsl::id);
        apply_equal_filter!(query, item_id, stock_line_dsl::item_id);
        apply_equal_filter!(query, location_id, stock_line_dsl::location_id);
        apply_date_filter!(query, expiry_date, stock_line_dsl::expiry_date);
        apply_equal_filter!(query, store_id, stock_line_dsl::store_id);

        query = match is_available {
            Some(true) => query.filter(stock_line_dsl::available_number_of_packs.gt(0.0)),
            Some(false) => query.filter(stock_line_dsl::available_number_of_packs.le(0.0)),
            None => query,
        };
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
            let items = ItemRepository::new(connection)
                .query_by_filter(item_filter, Some(store_id))
                .unwrap();
            let item_ids: Vec<String> = items.into_iter().map(|item| item.item_row.id).collect();

            return query.filter(stock_line_dsl::item_id.eq_any(item_ids));
        }
    }
    query
}

pub fn to_domain((stock_line_row, location_row, name_row): StockLineJoin) -> StockLine {
    StockLine {
        stock_line_row,
        location_row,
        name_row,
    }
}

impl StockLineFilter {
    pub fn new() -> StockLineFilter {
        StockLineFilter {
            expiry_date: None,
            id: None,
            is_available: None,
            item_code_or_name: None,
            item_id: None,
            location_id: None,
            store_id: None,
        }
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
}

impl StockLine {
    pub fn location_name(&self) -> Option<&str> {
        self.location_row
            .as_ref()
            .map(|location_row| location_row.name.as_str())
    }

    pub fn available_quantity(&self) -> f64 {
        self.stock_line_row.available_number_of_packs * self.stock_line_row.pack_size as f64
    }

    pub fn supplier_name(&self) -> Option<&str> {
        self.name_row
            .as_ref()
            .map(|name_row| name_row.name.as_str())
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use util::inline_init;

    use crate::{
        mock::MockDataInserts,
        mock::{mock_item_a, mock_store_a, MockData},
        test_db, Pagination, StockLine, StockLineFilter, StockLineRepository, StockLineRow,
        StockLineSort, StockLineSortField,
    };

    fn from_row(stock_line_row: StockLineRow) -> StockLine {
        inline_init(|r: &mut StockLine| {
            r.stock_line_row = stock_line_row;
        })
    }

    #[actix_rt::test]
    async fn test_stock_line_sort() {
        // expiry one
        fn line1() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line1".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 01, 01));
            })
        }
        // expiry two
        fn line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 02, 01));
            })
        }
        // expiry one (expiry null)
        fn line3() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line3".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
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
            vec![from_row(line1()), from_row(line2()), from_row(line3())],
            repo.query(Pagination::new(), None, Some(sort)).unwrap()
        );
        // Desc by expiry date
        let sort = StockLineSort {
            key: StockLineSortField::ExpiryDate,
            desc: Some(true),
        };
        // Make sure NULLS are first
        assert_eq!(
            vec![from_row(line3()), from_row(line2()), from_row(line1())],
            repo.query(Pagination::new(), None, Some(sort)).unwrap()
        );
    }

    #[actix_rt::test]
    async fn test_stock_line_is_available() {
        // Stock not available
        fn line1() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line1".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 01, 01));
                r.available_number_of_packs = 0.0;
            })
        }

        // Stock available
        fn line2() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "line2".to_string();
                r.store_id = mock_store_a().id;
                r.item_id = mock_item_a().id;
                r.expiry_date = Some(NaiveDate::from_ymd(2021, 02, 01));
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
            vec![from_row(line1())],
            repo.query(
                Pagination::new(),
                Some(StockLineFilter::new().is_available(false)),
                None
            )
            .unwrap()
        );

        // Stock available
        assert_eq!(
            vec![from_row(line2())],
            repo.query(
                Pagination::new(),
                Some(StockLineFilter::new().is_available(true)),
                None
            )
            .unwrap()
        );
    }
}
