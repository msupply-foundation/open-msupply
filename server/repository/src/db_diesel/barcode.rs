use super::{
    barcode_row::{barcode, barcode::dsl as barcode_dsl},
    BarcodeRow, DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct Barcode {
    pub barcode_row: BarcodeRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct BarcodeFilter {
    pub id: Option<EqualFilter<String>>,
    pub value: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub pack_size: Option<EqualFilter<i32>>,
}

#[derive(PartialEq, Debug)]
pub enum BarcodeSortField {
    Id,
    Barcode,
}

pub type BarcodeSort = Sort<BarcodeSortField>;

pub struct BarcodeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRepository { connection }
    }

    pub fn count(&self, filter: Option<BarcodeFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: BarcodeFilter) -> Result<Vec<Barcode>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<BarcodeFilter>,
        sort: Option<BarcodeSort>,
    ) -> Result<Vec<Barcode>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                BarcodeSortField::Id => {
                    apply_sort_no_case!(query, sort, barcode_dsl::id)
                }
                BarcodeSortField::Barcode => {
                    apply_sort_no_case!(query, sort, barcode_dsl::value)
                }
            }
        } else {
            query = query.order(barcode_dsl::value.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<BarcodeRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(barcode_dsl::barcode)
            .values(row)
            .on_conflict(barcode_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(barcode_dsl::barcode)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

type BoxedLogQuery = barcode::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<BarcodeFilter>) -> BoxedLogQuery {
    let mut query = barcode::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, barcode_dsl::id);
        apply_equal_filter!(query, filter.value, barcode_dsl::value);
        apply_equal_filter!(query, filter.item_id, barcode_dsl::item_id);
        apply_equal_filter!(query, filter.pack_size, barcode_dsl::pack_size);
    }

    query
}

pub fn to_domain(barcode_row: BarcodeRow) -> Barcode {
    Barcode { barcode_row }
}

impl BarcodeFilter {
    pub fn new() -> BarcodeFilter {
        BarcodeFilter {
            id: None,
            value: None,
            item_id: None,
            pack_size: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn value(mut self, filter: EqualFilter<String>) -> Self {
        self.value = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn pack_size(mut self, filter: EqualFilter<i32>) -> Self {
        self.pack_size = Some(filter);
        self
    }
}
