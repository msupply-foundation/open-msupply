use super::{
    stock_relocation_row::{stock_relocation, StockRelocationRow, StockRelocationStatus},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::{apply_equal_filter, apply_sort};
use crate::{EqualFilter, Pagination, Sort};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct StockRelocation {
    pub stock_relocation_row: StockRelocationRow,
}

#[derive(Clone, Default)]
pub struct StockRelocationFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<StockRelocationStatus>>,
    pub stock_movement_number: Option<EqualFilter<i64>>,
}

#[derive(PartialEq, Debug)]
pub enum StockRelocationSortField {
    CreatedDatetime,
    FinalisedDatetime,
    Status,
    StockMovementNumber,
}

pub type StockRelocationSort = Sort<StockRelocationSortField>;

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
                StockRelocationSortField::StockMovementNumber => {
                    apply_sort!(query, sort, stock_relocation::stock_movement_number)
                }
            }
        } else {
            query = query.order(stock_relocation::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockRelocationRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<StockRelocationFilter>,
    ) -> BoxedStockRelocationQuery {
        let mut query = stock_relocation::table.into_boxed();

        if let Some(f) = filter {
            let StockRelocationFilter {
                id,
                store_id,
                status,
                stock_movement_number,
            } = f;

            apply_equal_filter!(query, id, stock_relocation::id);
            apply_equal_filter!(query, store_id, stock_relocation::store_id);
            apply_equal_filter!(query, status, stock_relocation::status);
            apply_equal_filter!(
                query,
                stock_movement_number,
                stock_relocation::stock_movement_number
            );
        }

        query
    }
}

fn to_domain(stock_relocation_row: StockRelocationRow) -> StockRelocation {
    StockRelocation {
        stock_relocation_row,
    }
}

type BoxedStockRelocationQuery = IntoBoxed<'static, stock_relocation::table, DBType>;

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
    pub fn stock_movement_number(mut self, filter: EqualFilter<i64>) -> Self {
        self.stock_movement_number = Some(filter);
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
        mock::MockDataInserts, test_db::setup_all, EqualFilter, StockRelocationFilter,
        StockRelocationRepository, StockRelocationRow, StockRelocationSort, StockRelocationSortField,
        StockRelocationStatus, Upsert,
    };

    fn relocation(id: &str) -> StockRelocationRow {
        StockRelocationRow {
            id: id.to_string(),
            store_id: "store_a".to_string(),
            stock_movement_number: 1,
            status: StockRelocationStatus::Finalised,
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            created_by: "user_account_a".to_string(),
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
                StockRelocationFilter::new()
                    .stock_movement_number(EqualFilter::equal_to(1))
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
