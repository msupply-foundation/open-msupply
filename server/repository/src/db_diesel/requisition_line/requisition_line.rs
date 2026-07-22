use crate::{
    db_diesel::item_row::item,
    diesel_macros::{
        apply_equal_filter, apply_float_filter, apply_sort, apply_sort_asc_nulls_last,
        apply_sort_no_case, apply_string_filter, apply_string_or_filter,
    },
    repository_error::RepositoryError,
    requisition_row::requisition,
    DBType, ItemRow, Pagination, RequisitionRow, StorageConnection,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use super::{
    requisition_line_row::{requisition_line, requisition_line_months_of_stock},
    RequisitionLineFilter, RequisitionLineMonthsOfStockRow, RequisitionLineRow,
    RequisitionLineSort, RequisitionLineSortField,
};

type RequisitionLineJoin = (
    RequisitionLineRow,
    ItemRow,
    RequisitionRow,
    RequisitionLineMonthsOfStockRow,
);

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow,
    pub item_row: ItemRow,
    pub requisition_row: RequisitionRow,
    pub months_of_stock_row: RequisitionLineMonthsOfStockRow,
}

pub struct RequisitionLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRepository { connection }
    }

    pub fn count(&self, filter: Option<RequisitionLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter)?;
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: RequisitionLineFilter,
    ) -> Result<Option<RequisitionLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: RequisitionLineFilter,
    ) -> Result<Vec<RequisitionLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<RequisitionLineFilter>,
        sort: Option<RequisitionLineSort>,
    ) -> Result<Vec<RequisitionLine>, RepositoryError> {
        let mut query = create_filtered_query(filter)?;

        if let Some(sort) = sort {
            match sort.key {
                RequisitionLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code);
                }
                RequisitionLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                RequisitionLineSortField::RequestedQuantity => {
                    apply_sort!(query, sort, requisition_line::requested_quantity);
                }
                RequisitionLineSortField::SuggestedQuantity => {
                    apply_sort!(query, sort, requisition_line::suggested_quantity);
                }
                RequisitionLineSortField::SupplyQuantity => {
                    apply_sort!(query, sort, requisition_line::supply_quantity);
                }
                RequisitionLineSortField::ApprovedQuantity => {
                    apply_sort!(query, sort, requisition_line::approved_quantity);
                }
                RequisitionLineSortField::Comment => {
                    apply_sort_asc_nulls_last!(query, sort, requisition_line::comment);
                }
                RequisitionLineSortField::DefaultPackSize => {
                    apply_sort!(query, sort, item::default_pack_size);
                }
                RequisitionLineSortField::MonthsOfStock => {
                    apply_sort_asc_nulls_last!(
                        query,
                        sort,
                        requisition_line_months_of_stock::months_of_stock
                    );
                }
            };
        }

        // Stable tiebreaker so paginated results don't shuffle or drop rows
        // when the primary sort column has ties.
        let result = query
            .then_order_by(requisition_line::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<RequisitionLineJoin>(self.connection.lock().connection())?;

        Ok(result
            .into_iter()
            .map(
                |(requisition_line_row, item_row, requisition_row, months_of_stock_row)| {
                    RequisitionLine {
                        requisition_line_row,
                        item_row,
                        requisition_row,
                        months_of_stock_row,
                    }
                },
            )
            .collect())
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    requisition_line::table
        .inner_join(item::table)
        .inner_join(requisition::table)
        .inner_join(requisition_line_months_of_stock::table)
}

type BoxedRequisitionLineQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(
    filter: Option<RequisitionLineFilter>,
) -> Result<BoxedRequisitionLineQuery, RepositoryError> {
    let mut query = query().into_boxed();

    if let Some(f) = filter {
        // or filter needs to be applied before and filters
        if f.item_code_or_name.is_some() {
            apply_string_filter!(query, f.item_code_or_name.clone(), item::code);
            apply_string_or_filter!(query, f.item_code_or_name, item::name);
        }

        apply_equal_filter!(query, f.id, requisition_line::id);
        apply_equal_filter!(query, f.store_id, requisition::store_id);
        apply_equal_filter!(query, f.requisition_id, requisition_line::requisition_id);
        apply_equal_filter!(
            query,
            f.requested_quantity,
            requisition_line::requested_quantity
        );
        apply_equal_filter!(query, f.item_id, item::id);
        apply_equal_filter!(query, f.r#type, requisition::type_);
        apply_equal_filter!(query, f.status, requisition::status);
        apply_string_filter!(query, f.comment, requisition_line::comment);
        apply_float_filter!(
            query,
            f.months_of_stock,
            requisition_line_months_of_stock::months_of_stock
        );
    }

    Ok(query)
}
