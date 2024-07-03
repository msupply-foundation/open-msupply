use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterInput, EqualFilterStringInput};
use graphql_core::simple_generic_errors::{NodeError, NodeErrorInterface};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::{
    generic_filters::StringFilterInput, pagination::PaginationInput,
    standard_graphql_error::list_error_to_gql_err, ContextExt,
};
use graphql_types::types::StoreNode;
use repository::{EqualFilter, StoreFilter, StoreSort, StoreSortField};
use repository::{PaginationOption, StringFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct StoreFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub code: Option<StringFilterInput>,
    pub name: Option<StringFilterInput>,
    pub name_code: Option<StringFilterInput>,
    pub site_id: Option<EqualFilterInput<i32>>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum StoreSortFieldInput {
    Code,
    Name,
    NameCode,
}

#[derive(InputObject)]
pub struct StoreSortInput {
    /// Sort query result by `key`
    key: StoreSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(SimpleObject)]
pub struct StoreConnector {
    total_count: u32,
    nodes: Vec<StoreNode>,
}

#[derive(Union)]
pub enum StoreResponse {
    Error(NodeError),
    Response(StoreNode),
}

#[derive(Union)]
pub enum StoresResponse {
    Response(StoreConnector),
}

pub fn get_store(ctx: &Context<'_>, id: &str) -> Result<StoreResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStore,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;
    let service = &service_provider.general_service;

    let store_option = service.get_store(
        &service_context,
        StoreFilter::new().id(EqualFilter::equal_to(id)),
    )?;

    let response = match store_option {
        Some(store) => StoreResponse::Response(StoreNode::from_domain(store)),
        None => StoreResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}

pub fn stores(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<StoreFilterInput>,
    sort: Option<Vec<StoreSortInput>>,
) -> Result<StoresResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStore,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;
    let service = &service_provider.general_service;

    // TODO add auth validation and restrict returned stores according to the user's permissions

    let result = service
        .get_stores(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(list_error_to_gql_err)?;
    Ok(StoresResponse::Response({
        StoreConnector {
            total_count: result.count,
            nodes: result
                .rows
                .into_iter()
                .map(StoreNode::from_domain)
                .collect(),
        }
    }))
}

impl StoreFilterInput {
    fn to_domain(self) -> StoreFilter {
        let StoreFilterInput {
            id,
            code,
            name,
            name_code,
            site_id,
        } = self;

        StoreFilter {
            id: id.map(EqualFilter::from),
            code: code.map(StringFilter::from),
            name_id: None,
            name: name.map(StringFilter::from),
            name_code: name_code.map(StringFilter::from),
            site_id: site_id.map(EqualFilter::from),
            om_site_id: None, // TODO... consolidate w site_id?
        }
    }
}

impl StoreSortInput {
    pub fn to_domain(self) -> StoreSort {
        let key = match self.key {
            StoreSortFieldInput::Code => StoreSortField::Code,
            StoreSortFieldInput::Name => StoreSortField::Name,
            StoreSortFieldInput::NameCode => StoreSortField::NameCode,
        };

        StoreSort {
            key,
            desc: self.desc,
        }
    }
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::{mock_name_a, mock_store_a};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use repository::{EqualFilter, RepositoryError, Store, StoreFilter};
    use serde_json::json;
    use service::service_provider::GeneralServiceTrait;
    use service::service_provider::{ServiceContext, ServiceProvider};

    use crate::GeneralQueries;

    type GetStore = dyn Fn(StoreFilter) -> Result<Option<Store>, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<GetStore>);

    impl GeneralServiceTrait for TestService {
        fn get_store(
            &self,
            _: &ServiceContext,
            filter: StoreFilter,
        ) -> Result<Option<Store>, RepositoryError> {
            self.0(filter)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.general_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn graphql_store_mapping() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "graphql_store_mapping",
            MockDataInserts::none(),
        )
        .await;

        let query = r#"
            query TestQuery($id: String!) {
                store(id: $id) {
                    ... on NodeError {
                        error {
                        __typename
                        }
                    }
                    ... on StoreNode {
                        id
                    }
                }
            }          
        "#;

        let variables = Some(json!({
            "id": "store_id"
        }));

        // Test error mapping
        let test_service = TestService(Box::new(|_| Ok(None)));

        let expected = json!({
            "store": {
                "error" : {
                    "__typename": "RecordNotFound"
                }
            }
        }
        );

        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test ok mapping
        let test_service = TestService(Box::new(|filter| {
            assert_eq!(
                StoreFilter::new().id(EqualFilter::equal_to("store_id")),
                filter
            );

            Ok(Some(Store {
                store_row: mock_store_a(),
                name_row: mock_name_a(),
            }))
        }));

        let expected = json!({
            "store": {
                "id": mock_store_a().id
            }
        }
        );

        assert_graphql_query!(
            &settings,
            &query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
