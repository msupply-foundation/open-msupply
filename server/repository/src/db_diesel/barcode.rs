use super::{barcode_row::barcode, name_row::name, BarcodeRow, DBType, NameRow, StorageConnection};
use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct Barcode {
    pub barcode_row: BarcodeRow,
    pub manufacturer_name_row: Option<NameRow>,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct BarcodeFilter {
    pub id: Option<EqualFilter<String>>,
    pub value: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub pack_size: Option<EqualFilter<f64>>,
    /// `Some(false)` for barcodes central hasn't removed
    pub is_deleted: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum BarcodeSortField {
    Id,
    Barcode,
}

pub type BarcodeSort = Sort<BarcodeSortField>;
type BarcodeJoin = (BarcodeRow, Option<NameRow>);

#[diesel::dsl::auto_type]
fn query() -> _ {
    barcode::table.left_join(name::table)
}

type BoxedBarcodeQuery = IntoBoxed<'static, query, DBType>;

pub struct BarcodeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRepository { connection }
    }

    pub fn count(&self, filter: Option<BarcodeFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
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
                    apply_sort_no_case!(query, sort, barcode::id)
                }
                BarcodeSortField::Barcode => {
                    apply_sort_no_case!(query, sort, barcode::value)
                }
            }
        } else {
            query = query.order(barcode::value.asc())
        }

        let result = query
            // Stable tiebreaker so paginated results don't shuffle or drop rows
            // when the primary sort column has ties.
            .then_order_by(barcode::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<BarcodeJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn create_filtered_query(filter: Option<BarcodeFilter>) -> BoxedBarcodeQuery {
    let mut query = query().into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, barcode::id);
        apply_equal_filter!(query, filter.value, barcode::value);
        apply_equal_filter!(query, filter.item_id, barcode::item_id);
        apply_equal_filter!(query, filter.pack_size, barcode::pack_size);
        if let Some(is_deleted) = filter.is_deleted {
            query = if is_deleted {
                query.filter(barcode::deleted_datetime.is_not_null())
            } else {
                query.filter(barcode::deleted_datetime.is_null())
            };
        }
    }

    query
}

fn to_domain((barcode_row, manufacturer_name_row): BarcodeJoin) -> Barcode {
    Barcode {
        barcode_row,
        manufacturer_name_row,
    }
}

impl BarcodeFilter {
    pub fn new() -> BarcodeFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn value(mut self, filter: EqualFilter<String>) -> Self {
        self.value = Some(filter);
        self
    }

    pub fn is_deleted(mut self, is_deleted: bool) -> Self {
        self.is_deleted = Some(is_deleted);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn pack_size(mut self, filter: EqualFilter<f64>) -> Self {
        self.pack_size = Some(filter);
        self
    }
}
