use crate::{
    DBType, ItemRow, Pagination, RequisitionRow, StorageConnection,
    db_diesel::item_row::item,
    diesel_macros::{
        apply_equal_filter, apply_float_filter, apply_sort, apply_sort_asc_nulls_last,
        apply_sort_no_case, apply_string_filter, apply_string_or_filter,
    },
    repository_error::RepositoryError,
    requisition_row::requisition,
};

use diesel::{
    dsl::{IntoBoxed, case_when},
    prelude::*,
};

use super::{
    RequisitionLineFilter, RequisitionLineRow, RequisitionLineSort, RequisitionLineSortField,
    requisition_line_row::requisition_line,
};

type RequisitionLineJoin = (RequisitionLineRow, ItemRow, RequisitionRow);

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow,
    pub item_row: ItemRow,
    pub requisition_row: RequisitionRow,
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
                    apply_sort_asc_nulls_last!(query, sort, months_of_stock());
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
                |(requisition_line_row, item_row, requisition_row)| RequisitionLine {
                    requisition_line_row,
                    item_row,
                    requisition_row,
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
}

// No stock and no consumption counts as 0 months; stock but no consumption is
// unknown (NULL, so it never matches a filter)
#[diesel::dsl::auto_type]
fn months_of_stock() -> _ {
    let zero: f64 = 0.0;
    case_when(
        requisition_line::average_monthly_consumption
            .eq(zero)
            .and(requisition_line::available_stock_on_hand.eq(zero)),
        zero.into_sql::<diesel::sql_types::Double>(),
    )
    .when(
        requisition_line::average_monthly_consumption.ne(zero),
        requisition_line::available_stock_on_hand / requisition_line::average_monthly_consumption,
    )
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
        apply_float_filter!(query, f.months_of_stock, months_of_stock());
    }

    Ok(query)
}

#[cfg(test)]
mod test {
    use crate::{
        EqualFilter, FloatFilter, Pagination, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionLineRow, RequisitionLineSort, RequisitionLineSortField, StringFilter,
        mock::{
            MockData, MockDataInserts, mock_item_a, mock_item_b, mock_name_a,
            mock_request_draft_requisition, mock_store_a,
        },
        requisition_row::RequisitionRow,
        test_db,
    };

    #[actix_rt::test]
    async fn test_requisition_line_filter_and_sort() {
        let requisition = RequisitionRow {
            id: "filter_requisition".to_string(),
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            ..Default::default()
        };
        let line_a = RequisitionLineRow {
            id: "filter_line_a".to_string(),
            requisition_id: requisition.id.clone(),
            item_id: mock_item_a().id,
            comment: Some("urgent".to_string()),
            ..Default::default()
        };
        let line_b = RequisitionLineRow {
            id: "filter_line_b".to_string(),
            item_id: mock_item_b().id,
            comment: None,
            ..line_a.clone()
        };
        let other_requisition = RequisitionRow {
            id: "other_requisition".to_string(),
            ..requisition.clone()
        };
        // Same item as line_b, so an item search that leaks past the
        // requisition filter would return it
        let other_line_b = RequisitionLineRow {
            id: "other_line_b".to_string(),
            requisition_id: other_requisition.id.clone(),
            ..line_b.clone()
        };
        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_requisition_line_filter_and_sort",
            MockDataInserts::none().names().stores().units().items(),
            MockData {
                requisitions: vec![requisition.clone(), other_requisition],
                requisition_lines: vec![line_a.clone(), line_b.clone(), other_line_b],
                ..Default::default()
            },
        )
        .await;
        let repo = RequisitionLineRepository::new(&connection);
        let this_requisition = || {
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition.id.clone()))
        };
        let ids =
            |filter: RequisitionLineFilter, sort: Option<RequisitionLineSort>| -> Vec<String> {
                repo.query(Pagination::all(), Some(filter), sort)
                    .unwrap()
                    .into_iter()
                    .map(|l| l.requisition_line_row.id)
                    .collect()
            };

        // Matches on name as well as code, and still only within the requisition
        let mut by_name = this_requisition();
        by_name.item_code_or_name = Some(StringFilter::like("Item B"));
        assert_eq!(ids(by_name, None), vec![line_b.id.clone()]);

        let mut by_code = this_requisition();
        by_code.item_code_or_name = Some(StringFilter::like("item_a_code"));
        assert_eq!(ids(by_code, None), vec![line_a.id.clone()]);

        assert_eq!(
            ids(this_requisition().comment(StringFilter::like("urg")), None),
            vec![line_a.id.clone()]
        );

        assert_eq!(
            ids(
                this_requisition(),
                Some(RequisitionLineSort {
                    key: RequisitionLineSortField::ItemName,
                    desc: Some(true),
                })
            ),
            vec![line_b.id, line_a.id]
        );
    }

    #[actix_rt::test]
    async fn test_requisition_line_months_of_stock() {
        let line = |id: &str, stock: f64, consumption: f64| RequisitionLineRow {
            id: id.to_string(),
            requisition_id: mock_request_draft_requisition().id,
            item_id: mock_item_a().id,
            available_stock_on_hand: stock,
            average_monthly_consumption: consumption,
            ..Default::default()
        };
        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_requisition_line_months_of_stock",
            MockDataInserts::all(),
            MockData {
                requisition_lines: vec![
                    line("no_stock_no_consumption", 0.0, 0.0),
                    line("two_months", 20.0, 10.0),
                    line("stock_no_consumption", 5.0, 0.0),
                ],
                ..Default::default()
            },
        )
        .await;
        let repo = RequisitionLineRepository::new(&connection);
        let these_lines = || {
            RequisitionLineFilter::new().id(EqualFilter::equal_any(vec![
                "no_stock_no_consumption".to_string(),
                "two_months".to_string(),
                "stock_no_consumption".to_string(),
            ]))
        };
        let ids = |lines: Vec<crate::RequisitionLine>| -> Vec<String> {
            lines
                .into_iter()
                .map(|l| l.requisition_line_row.id)
                .collect()
        };

        // Unknown months of stock (stock, no consumption) never matches a filter
        let under_one_month = repo
            .query_by_filter(these_lines().months_of_stock(FloatFilter::below_than(1.0)))
            .unwrap();
        assert_eq!(ids(under_one_month), vec!["no_stock_no_consumption"]);

        let sorted = repo
            .query(
                Pagination::all(),
                Some(these_lines()),
                Some(RequisitionLineSort {
                    key: RequisitionLineSortField::MonthsOfStock,
                    desc: None,
                }),
            )
            .unwrap();
        assert_eq!(
            ids(sorted),
            vec![
                "no_stock_no_consumption",
                "two_months",
                "stock_no_consumption"
            ]
        );
    }
}
