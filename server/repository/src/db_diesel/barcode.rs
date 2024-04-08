use super::{
    barcode_row::{barcode, barcode::dsl as barcode_dsl},
    name_link_row::{name_link, name_link::dsl as name_link_dsl},
    name_row::{name, name::dsl as name_dsl},
    BarcodeRow, DBType, NameLinkRow, NameRow, StorageConnection,
};
use diesel::{
    helper_types::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

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
    pub gtin: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub pack_size: Option<EqualFilter<i32>>,
}

#[derive(PartialEq, Debug)]
pub enum BarcodeSortField {
    Id,
    Barcode,
}

pub type BarcodeSort = Sort<BarcodeSortField>;
type BarcodeJoin = (BarcodeRow, Option<(NameLinkRow, NameRow)>);

pub struct BarcodeRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> BarcodeRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        BarcodeRepository { connection }
    }

    pub fn count(&mut self, filter: Option<BarcodeFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &mut self,
        filter: BarcodeFilter,
    ) -> Result<Vec<Barcode>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &mut self,
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
                    apply_sort_no_case!(query, sort, barcode_dsl::gtin)
                }
            }
        } else {
            query = query.order(barcode_dsl::gtin.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<BarcodeJoin>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedBarcodeQuery =
    IntoBoxed<'static, LeftJoin<barcode::table, InnerJoin<name_link::table, name::table>>, DBType>;

fn create_filtered_query(filter: Option<BarcodeFilter>) -> BoxedBarcodeQuery {
    let mut query = barcode_dsl::barcode
        .left_join(name_link_dsl::name_link.inner_join(name_dsl::name))
        .into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, barcode_dsl::id);
        apply_equal_filter!(query, filter.gtin, barcode_dsl::gtin);
        apply_equal_filter!(query, filter.item_id, barcode_dsl::item_id);
        apply_equal_filter!(query, filter.pack_size, barcode_dsl::pack_size);
    }

    query
}

fn to_domain((barcode_row, name_link): BarcodeJoin) -> Barcode {
    Barcode {
        barcode_row,
        manufacturer_name_row: name_link.map(|(_, name)| name),
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

    pub fn gtin(mut self, filter: EqualFilter<String>) -> Self {
        self.gtin = Some(filter);
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
