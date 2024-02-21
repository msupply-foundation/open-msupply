mod mutations;
use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{asset_catalogue::AssetCatalogueFilter, EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct AssetCatalogueQueries;

#[Object]
impl AssetCatalogueQueries {
    /// Query omSupply "asset_catalogue" entries
    pub async fn asset_catalogues(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetCatalogueFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetCatalogueSortInput>>,
    ) -> Result<AssetCataloguesResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                // TODO: add permissions
                resource: Resource::QueryLocation,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(AssetCatalogueFilter::from)
            .unwrap_or(AssetCatalogueFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let asset_catalogues = service_provider
            .asset_catalogue_service
            .get_asset_catalogue(
                &service_context,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(AssetCataloguesResponse::Response(
            AssetCatalogueConnector::from_domain(asset_catalogues),
        ))
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphl_test;
    use repository::mock::mock_asset_catalogue;
    use repository::{
        asset_catalogue::{
            AssetCatalogue, AssetCatalogueFilter, AssetCatalogueSort, AssetCatalogueSortField,
        },
        mock::MockDataInserts,
        AssetCatalogueRow, StorageConnectionManager,
    };
    use repository::{EqualFilter, PaginationOption, Sort, StringFilter};
    use serde_json::json;

    use service::{
        asset_catalogue::AssetCatalogueServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::AssetCatalogueQueries;

    type GetAssetCatalogues = dyn Fn(
            Option<PaginationOption>,
            Option<AssetCatalogueFilter>,
            Option<AssetCatalogueSort>,
        ) -> Result<ListResult<AssetCatalogue>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetAssetCatalogues>);

    impl AssetCatalogueServiceTrait for TestService {
        fn get_asset_catalogue(
            &self,
            _: &ServiceContext,
            pagination: Option<PaginationOption>,
            filter: Option<AssetCatalogueFilter>,
            sort: Option<AssetCatalogueSort>,
        ) -> Result<ListResult<AssetCatalogue>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        asset_catalogue_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.asset_catalogue_service = Box::new(asset_catalogue_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_asset_catalogue_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            AssetCatalogueQueries,
            EmptyMutation,
            "test_graphql_asset_catalogue_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            asset_catalogue(storeId: \"store_a\") {
              ... on AssetCatalogueConnector {
                nodes {
                  id
                  code
                  category
                  class
                  make
                  model
                  type
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![AssetCatalogue {
                    asset_catalogue_row: AssetCatalogueRow {
                        id: "asset_catalogue_one".to_owned(),
                        code: "test_code".to_owned(),
                        make: "fridge maker one".to_owned(),
                        model: "a fridge".to_owned(),
                        store_id: "store_a".to_owned(),
                        category_id: "category_a".to_owned(),
                        class_id: "class_a".to_owned(),
                        type_id: "type_a".to_owned(),
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "asset_catalogue": {
                  "nodes": [
                      {
                          "id": "asset_catalogue_one",
                          "code": "test_code",
                            "category": "category_a",
                            "class": "class_a",
                            "make": "fridge maker one",
                            "model": "a fridge",
                            "type": "type_a"
                      },
                  ],
                  "totalCount": 1
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test no records

        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: Vec::new(),
                count: 0,
            })
        }));

        let expected = json!({
              "asset_catalogue": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_asset_catalogue_inputs() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            AssetCatalogueQueries,
            EmptyMutation,
            "test_graphql_asset_catalogue_inputs",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query(
            $sort: [AssetCatalogueSortInput]
            $filter: AssetCatalogueFilterInput
          ) {
            asset_catalogue(sort: $sort, filter: $filter, storeId: \"store_a\") {
              __typename
            }
          }

        "#;

        let expected = json!({
              "asset_catalogue": {
                  "__typename": "AssetCatalogueConnector"
              }
          }
        );

        // Test sort by make no desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: AssetCatalogueSortField::Make,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "make",
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test sort by code with desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: AssetCatalogueSortField::Code,
                    desc: Some(true)
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "code",
            "desc": true
          }]
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test filter
        let test_service = TestService(Box::new(|_, filter, _| {
            assert_eq!(
                filter,
                Some(
                    AssetCatalogueFilter::new()
                        .store_id(EqualFilter::equal_to("store_a"))
                        .make(StringFilter::equal_to("asset_make"))
                )
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "filter": {
            "name": { "equalTo": "asset_make" },
          }
        });

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_asset_catalogue_always_filtered_by_store() {
        let (_, _, _, settings) = setup_graphl_test(
            AssetCatalogueQueries,
            EmptyMutation,
            "test_asset_catalogue_always_filtered_by_store",
            MockDataInserts::none().names().stores().asset_catalogue(),
        )
        .await;

        let count_store_a = mock_asset_catalogue()
            .iter()
            .filter(|v| v.store_id == "store_a")
            .count();
        let count_store_b = mock_asset_catalogue()
            .iter()
            .filter(|v| v.store_id == "store_b")
            .count();
        assert!(count_store_a != count_store_b);

        let query = r#"
        query {
            asset_catalogue(storeId: \"store_a\") {
              ... on AssetCatalogueConnector {
                totalCount
              }
            }
        }
        "#;
        let expected = json!({
              "asset_catalogue": {
                  "totalCount": count_store_a
              }
          }
        );
        assert_graphql_query!(&settings, query, &None, &expected, None);

        let query = r#"
        query {
            asset_catalogue(storeId: \"store_b\") {
              ... on AssetCatalogueConnector {
                totalCount
              }
            }
        }
        "#;
        let expected = json!({
              "asset_catalogue": {
                  "totalCount": count_store_b
              }
          }
        );
        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
