use super::{
    item_row::{item, ItemRow},
    stock_line_row::{stock_line, StockLineRow},
    stock_relocation_row::{stock_relocation, StockRelocationRow, StockRelocationStatus},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case,
    apply_string_filter, apply_string_or_filter,
};
use crate::{DatetimeFilter, EqualFilter, Pagination, Sort, StringFilter};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct StockRelocation {
    pub stock_relocation_row: StockRelocationRow,
    pub from_stock_line_row: StockLineRow,
    pub item_row: ItemRow,
}

#[derive(Clone, Default)]
pub struct StockRelocationFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<StockRelocationStatus>>,
    pub item_code_or_name: Option<StringFilter>,
    pub from_location_id: Option<EqualFilter<String>>,
    pub to_location_id: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
}

#[derive(PartialEq, Debug)]
pub enum StockRelocationSortField {
    CreatedDatetime,
    FinalisedDatetime,
    Status,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    ExpiryDate,
    FromLocation,
    ToLocation,
}

pub type StockRelocationSort = Sort<StockRelocationSortField>;

type StockRelocationJoin = (StockRelocationRow, (StockLineRow, ItemRow));

pub struct StockRelocationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationRepository { connection }
    }

    pub fn count(&self, filter: Option<StockRelocationFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockRelocationFilter,
    ) -> Result<Vec<StockRelocation>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: StockRelocationFilter,
    ) -> Result<Option<StockRelocation>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockRelocationFilter>,
        sort: Option<StockRelocationSort>,
    ) -> Result<Vec<StockRelocation>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                StockRelocationSortField::CreatedDatetime => {
                    apply_sort!(query, sort, stock_relocation::created_datetime)
                }
                StockRelocationSortField::FinalisedDatetime => {
                    apply_sort!(query, sort, stock_relocation::finalised_datetime)
                }
                StockRelocationSortField::Status => {
                    apply_sort!(query, sort, stock_relocation::status)
                }
                StockRelocationSortField::NumberOfPacks => {
                    apply_sort!(query, sort, stock_relocation::from_number_of_packs)
                }
                StockRelocationSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code)
                }
                StockRelocationSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name)
                }
                StockRelocationSortField::Batch => {
                    apply_sort_no_case!(query, sort, stock_line::batch)
                }
                StockRelocationSortField::ExpiryDate => {
                    apply_sort!(query, sort, stock_line::expiry_date)
                }
                StockRelocationSortField::FromLocation => {
                    apply_sort!(query, sort, stock_relocation::from_location_id)
                }
                StockRelocationSortField::ToLocation => {
                    apply_sort!(query, sort, stock_relocation::to_location_id)
                }
            }
        } else {
            query = query.order(stock_relocation::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockRelocationJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<StockRelocationFilter>,
    ) -> BoxedStockRelocationQuery {
        let mut query = query().into_boxed();

        if let Some(f) = filter {
            let StockRelocationFilter {
                id,
                store_id,
                status,
                item_code_or_name,
                from_location_id,
                to_location_id,
                created_datetime,
                finalised_datetime,
            } = f;

            if item_code_or_name.is_some() {
                apply_string_filter!(query, item_code_or_name.clone(), item::code);
                apply_string_or_filter!(query, item_code_or_name, item::name);
            }

            apply_equal_filter!(query, id, stock_relocation::id);
            apply_equal_filter!(query, store_id, stock_relocation::store_id);
            apply_equal_filter!(query, status, stock_relocation::status);
            apply_equal_filter!(query, from_location_id, stock_relocation::from_location_id);
            apply_equal_filter!(query, to_location_id, stock_relocation::to_location_id);
            apply_date_time_filter!(query, created_datetime, stock_relocation::created_datetime);
            apply_date_time_filter!(
                query,
                finalised_datetime,
                stock_relocation::finalised_datetime
            );
        }

        query
    }
}

fn to_domain(
    (stock_relocation_row, (from_stock_line_row, item_row)): StockRelocationJoin,
) -> StockRelocation {
    StockRelocation {
        stock_relocation_row,
        from_stock_line_row,
        item_row,
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    stock_relocation::table.inner_join(stock_line::table.inner_join(item::table))
}

type BoxedStockRelocationQuery = IntoBoxed<'static, query, DBType>;

impl StockRelocationFilter {
    pub fn new() -> StockRelocationFilter {
        StockRelocationFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<StockRelocationStatus>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn item_code_or_name(mut self, filter: StringFilter) -> Self {
        self.item_code_or_name = Some(filter);
        self
    }
    pub fn from_location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.from_location_id = Some(filter);
        self
    }
    pub fn to_location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.to_location_id = Some(filter);
        self
    }
    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }
    pub fn finalised_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.finalised_datetime = Some(filter);
        self
    }
}

impl StockRelocationStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;

    use crate::{
        mock::{mock_location_1, mock_stock_line_a, MockDataInserts},
        test_db::setup_all,
        EqualFilter, StockRelocationFilter, StockRelocationRepository, StockRelocationRow,
        StockRelocationSort, StockRelocationSortField, StockRelocationStatus, StringFilter, Upsert,
    };

    fn relocation(id: &str) -> StockRelocationRow {
        StockRelocationRow {
            id: id.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            from_stock_line_id: mock_stock_line_a().id,
            from_location_id: Some(mock_location_1().id),
            from_number_of_packs: 5.0,
            status: StockRelocationStatus::Finalised,
            store_id: "store_a".to_string(),
            user_id: "user_account_a".to_string(),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn stock_relocation_query_repository() {
        let (_, connection, _, _) =
            setup_all("stock_relocation_query_repository", MockDataInserts::all()).await;

        let row = relocation("stock_relocation_1");
        row.upsert(&connection).unwrap();

        let repo = StockRelocationRepository::new(&connection);

        let result = repo
            .query_one(
                StockRelocationFilter::new()
                    .id(EqualFilter::equal_to("stock_relocation_1".to_string())),
            )
            .unwrap()
            .unwrap();
        assert_eq!(result.stock_relocation_row, row);
        assert_eq!(result.from_stock_line_row.id, mock_stock_line_a().id);
        assert_eq!(result.item_row.id, mock_stock_line_a().item_id);

        assert_eq!(
            repo.count(Some(
                StockRelocationFilter::new()
                    .store_id(EqualFilter::equal_to("store_a".to_string()))
                    .status(StockRelocationStatus::Finalised.equal_to())
            ))
            .unwrap(),
            1
        );
        assert_eq!(
            repo.query_by_filter(
                StockRelocationFilter::new().item_code_or_name(StringFilter::like("item_a"))
            )
            .unwrap()
            .len(),
            1
        );

        let sorted = repo
            .query(
                crate::Pagination::all(),
                None,
                Some(StockRelocationSort {
                    key: StockRelocationSortField::CreatedDatetime,
                    desc: Some(true),
                }),
            )
            .unwrap();
        assert!(sorted
            .iter()
            .any(|r| r.stock_relocation_row.id == "stock_relocation_1"));
    }
}
