use super::{
    item_link_row::{item_link, item_link::dsl as item_link_dsl},
    item_row::{item, item::dsl as item_dsl},
    requisition_line_row::{requisition_line, requisition_line::dsl as requisition_line_dsl},
    rnr_form_line_row::{rnr_form_line, rnr_form_line::dsl as rnr_form_line_dsl},
    DBType, RepositoryError, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    EqualFilter, ItemLinkRow, ItemRow, Pagination, RequisitionLineRow, RnRFormLineRow, Sort,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct RnRFormLine {
    pub rnr_form_line_row: RnRFormLineRow,
    pub requisition_line_row: Option<RequisitionLineRow>,
    pub item_row: ItemRow,
}
#[derive(Clone, Default)]
pub struct RnRFormLineFilter {
    pub rnr_form_id: Option<EqualFilter<String>>,
}

pub enum RnRFormLineSortField {
    ItemName,
}

pub type RnRFormLineSort = Sort<RnRFormLineSortField>;

pub struct RnRFormLineRepository<'a> {
    connection: &'a StorageConnection,
}

type RnRFormLineJoin = (
    RnRFormLineRow,
    (ItemLinkRow, ItemRow),
    Option<RequisitionLineRow>,
);

impl<'a> RnRFormLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RnRFormLineRepository { connection }
    }

    pub fn count(&self, filter: Option<RnRFormLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: RnRFormLineFilter,
    ) -> Result<Vec<RnRFormLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: RnRFormLineFilter,
    ) -> Result<Option<RnRFormLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<RnRFormLineFilter>,
        sort: Option<RnRFormLineSort>,
    ) -> Result<Vec<RnRFormLine>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                RnRFormLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item_dsl::name);
                }
            }
        } else {
            query = query.order_by(item_dsl::name.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<RnRFormLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (rnr_form_line_row, (_, item_row), requisition_line_row): RnRFormLineJoin,
) -> RnRFormLine {
    RnRFormLine {
        rnr_form_line_row,
        requisition_line_row,
        item_row,
    }
}
type BoxedRnRFormLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<rnr_form_line::table, InnerJoin<item_link::table, item::table>>,
        requisition_line::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<RnRFormLineFilter>) -> BoxedRnRFormLineQuery {
    let mut query = rnr_form_line_dsl::rnr_form_line
        .inner_join(item_link_dsl::item_link.inner_join(item_dsl::item))
        .left_join(requisition_line_dsl::requisition_line)
        .into_boxed();

    if let Some(f) = filter {
        let RnRFormLineFilter { rnr_form_id } = f;

        apply_equal_filter!(query, rnr_form_id, rnr_form_line_dsl::rnr_form_id);
    }
    query
}

impl RnRFormLineFilter {
    pub fn new() -> RnRFormLineFilter {
        RnRFormLineFilter::default()
    }

    pub fn rnr_form_id(mut self, filter: EqualFilter<String>) -> Self {
        self.rnr_form_id = Some(filter);
        self
    }
}
