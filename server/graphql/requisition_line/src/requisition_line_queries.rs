use async_graphql::*;
use graphql_core::generic_filters::{
    EqualFilterBigFloatingNumberInput, EqualFilterStringInput, FloatFilterInput, StringFilterInput,
};
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{RequisitionLineConnector, RequisitionLineNode};
use repository::{
    EqualFilter, FloatFilter, PaginationOption, RequisitionLineFilter, RequisitionLineSort,
    RequisitionLineSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct RequisitionLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub requisition_id: Option<EqualFilterStringInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub item_code_or_name: Option<StringFilterInput>,
    pub requested_quantity: Option<EqualFilterBigFloatingNumberInput>,
    pub comment: Option<StringFilterInput>,
    /// Filter by months of stock (available_stock_on_hand / average_monthly_consumption)
    pub months_of_stock: Option<FloatFilterInput>,
}

impl From<RequisitionLineFilterInput> for RequisitionLineFilter {
    fn from(f: RequisitionLineFilterInput) -> Self {
        RequisitionLineFilter {
            id: f.id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            requisition_id: f.requisition_id.map(EqualFilter::from),
            item_id: f.item_id.map(EqualFilter::from),
            item_code_or_name: f.item_code_or_name.map(StringFilterInput::into),
            requested_quantity: f.requested_quantity.map(EqualFilter::from),
            comment: f.comment.map(StringFilterInput::into),
            months_of_stock: f.months_of_stock.map(FloatFilter::from),
            r#type: None,
            status: None,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::requisition_line::RequisitionLineSortField")]
pub enum RequisitionLineSortFieldInput {
    ItemCode,
    ItemName,
    RequestedQuantity,
    SuggestedQuantity,
    SupplyQuantity,
    ApprovedQuantity,
    Comment,
    DefaultPackSize,
    MonthsOfStock,
}

#[derive(InputObject)]
pub struct RequisitionLineSortInput {
    /// Sort query result by `key`
    pub key: RequisitionLineSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    pub desc: Option<bool>,
}

impl RequisitionLineSortInput {
    pub fn to_domain(self) -> RequisitionLineSort {
        RequisitionLineSort {
            key: RequisitionLineSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(Union)]
pub enum RequisitionLinesResponse {
    Response(RequisitionLineConnector),
}

pub fn requisition_lines(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<RequisitionLineFilterInput>,
    sort: Option<Vec<RequisitionLineSortInput>>,
) -> Result<RequisitionLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let mut filter = filter.map(RequisitionLineFilter::from).unwrap_or_default();
    filter.store_id = Some(EqualFilter::equal_to(store_id.to_string()));

    let requisition_lines = service_provider
        .requisition_line_service
        .get_requisition_lines(
            &service_context,
            page.map(PaginationOption::from),
            Some(filter),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(RequisitionLinesResponse::Response(
        RequisitionLineConnector {
            total_count: requisition_lines.count,
            nodes: requisition_lines
                .rows
                .into_iter()
                .map(RequisitionLineNode::from_domain)
                .collect(),
        },
    ))
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::{mock_item_a, mock_sent_request_requisition, MockDataInserts},
        PaginationOption, RequisitionLine, RequisitionLineFilter, RequisitionLineRow,
        RequisitionLineSort, RequisitionRow, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition_line::RequisitionLineServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::RequisitionLineQueries;

    type ServiceMethod = dyn Fn(
            &ServiceContext,
            Option<PaginationOption>,
            Option<RequisitionLineFilter>,
            Option<RequisitionLineSort>,
        ) -> Result<ListResult<RequisitionLine>, ListError>
        + Send
        + Sync;

    pub struct TestService(pub Box<ServiceMethod>);

    impl RequisitionLineServiceTrait for TestService {
        fn get_requisition_lines(
            &self,
            ctx: &ServiceContext,
            pagination: Option<PaginationOption>,
            filter: Option<RequisitionLineFilter>,
            sort: Option<RequisitionLineSort>,
        ) -> Result<ListResult<RequisitionLine>, ListError> {
            (self.0)(ctx, pagination, filter, sort)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_line_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_requisition_lines_query() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            RequisitionLineQueries,
            EmptyMutation,
            "test_graphql_requisition_lines_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query QueryRequisitionLines($storeId: String!, $filter: RequisitionLineFilterInput, $sort: [RequisitionLineSortInput!]) {
            requisitionLines(storeId: $storeId, filter: $filter, sort: $sort) {
                ... on RequisitionLineConnector {
                    totalCount
                    nodes {
                        id
                        requisitionId
                        item {
                            code
                            name
                        }
                    }
                }
            }
        }"#;

        let test_service = TestService(Box::new(|_, _, _, _| {
            Ok(ListResult {
                rows: vec![RequisitionLine {
                    requisition_line_row: RequisitionLineRow {
                        id: "id".to_string(),
                        requisition_id: mock_sent_request_requisition().id.clone(),
                        item_id: mock_item_a().id.clone(),
                        ..Default::default()
                    },
                    item_row: mock_item_a(),
                    requisition_row: RequisitionRow {
                        id: mock_sent_request_requisition().id.clone(),
                        ..mock_sent_request_requisition()
                    },
                    months_of_stock_row: Default::default(),
                }],
                count: 1,
            })
        }));

        let expected = json!({
            "requisitionLines": {
                "totalCount": 1,
                "nodes": [{
                    "id": "id",
                    "requisitionId": mock_sent_request_requisition().id,
                    "item": {
                        "code": "item_a_code",
                        "name": "Item A"
                    }
                }]
            }
        });

        let variables = Some(json!({
            "storeId": "store_id",
        }));

        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
