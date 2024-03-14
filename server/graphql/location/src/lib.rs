mod mutations;
use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{location::LocationFilter, EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct LocationQueries;

#[Object]
impl LocationQueries {
    /// Query omSupply "locations" entries
    pub async fn locations(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<LocationFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<LocationSortInput>>,
    ) -> Result<LocationsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryLocation,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(LocationFilter::from)
            .unwrap_or(LocationFilter::new())
            .store_id(EqualFilter::equal_to(&store_id));

        let locations = service_provider
            .location_service
            .get_locations(
                &service_context,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(LocationsResponse::Response(LocationConnector::from_domain(
            locations,
        )))
    }
}

#[derive(Default, Clone)]
pub struct LocationMutations;

#[Object]
impl LocationMutations {
    async fn insert_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertLocationInput,
    ) -> Result<InsertLocationResponse> {
        insert_location(ctx, &store_id, input)
    }

    async fn update_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateLocationInput,
    ) -> Result<UpdateLocationResponse> {
        update_location(ctx, &store_id, input)
    }

    async fn delete_location(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteLocationInput,
    ) -> Result<DeleteLocationResponse> {
        delete_location(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::mock::mock_locations;
    use repository::{
        location::{Location, LocationFilter, LocationSort, LocationSortField},
        mock::MockDataInserts,
        LocationRow, StorageConnectionManager,
    };
    use repository::{EqualFilter, PaginationOption, Sort, StringFilter};
    use serde_json::json;

    use service::{
        location::LocationServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::LocationQueries;

    type GetLocations = dyn Fn(
            Option<PaginationOption>,
            Option<LocationFilter>,
            Option<LocationSort>,
        ) -> Result<ListResult<Location>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetLocations>);

    impl LocationServiceTrait for TestService {
        fn get_locations(
            &self,
            _: &ServiceContext,
            pagination: Option<PaginationOption>,
            filter: Option<LocationFilter>,
            sort: Option<LocationSort>,
        ) -> Result<ListResult<Location>, ListError> {
            (self.0)(pagination, filter, sort)
        }
    }

    pub fn service_provider(
        location_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.location_service = Box::new(location_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_locations_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            LocationQueries,
            EmptyMutation,
            "test_graphql_locations_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            locations(storeId: \"store_a\") {
              ... on LocationConnector {
                nodes {
                  id
                  name
                  code
                  onHold
                  stock {
                      ... on StockLineConnector {
                          nodes {
                              id
                          }
                      }
                  }
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![Location {
                    location_row: LocationRow {
                        id: "location_on_hold".to_owned(),
                        name: "test_name".to_owned(),
                        code: "test_code".to_owned(),
                        on_hold: true,
                        store_id: "store_a".to_owned(),
                    },
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "locations": {
                  "nodes": [
                      {
                          "id": "location_on_hold",
                          "name": "test_name",
                          "code": "test_code",
                          "onHold": true,
                          "stock": {
                              "nodes": [
                                  {
                                      "id": "stock_line_location_is_on_hold"
                                  }
                              ]
                          }
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
              "locations": {
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
    async fn test_graphql_locations_inputs() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            LocationQueries,
            EmptyMutation,
            "test_graphql_location_inputs",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query(
            $sort: [LocationSortInput]
            $filter: LocationFilterInput
          ) {
            locations(sort: $sort, filter: $filter, storeId: \"store_a\") {
              __typename
            }
          }

        "#;

        let expected = json!({
              "locations": {
                  "__typename": "LocationConnector"
              }
          }
        );

        // Test sort by name no desc
        let test_service = TestService(Box::new(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: LocationSortField::Name,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "sort": [{
            "key": "name",
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
                    key: LocationSortField::Code,
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
                    LocationFilter::new()
                        .store_id(EqualFilter::equal_to("store_a"))
                        .name(StringFilter::equal_to("match_name"))
                )
            );
            Ok(ListResult::empty())
        }));

        let variables = json!({
          "filter": {
            "name": { "equalTo": "match_name"},
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
    async fn test_locations_always_filtered_by_store() {
        let (_, _, _, settings) = setup_graphql_test(
            LocationQueries,
            EmptyMutation,
            "test_locations_always_filtered_by_store",
            MockDataInserts::none().names().stores().locations(),
        )
        .await;

        let count_store_a = mock_locations()
            .iter()
            .filter(|v| v.store_id == "store_a")
            .count();
        let count_store_b = mock_locations()
            .iter()
            .filter(|v| v.store_id == "store_b")
            .count();
        assert!(count_store_a != count_store_b);

        let query = r#"
        query {
            locations(storeId: \"store_a\") {
              ... on LocationConnector {
                totalCount
              }
            }
        }
        "#;
        let expected = json!({
              "locations": {
                  "totalCount": count_store_a
              }
          }
        );
        assert_graphql_query!(&settings, query, &None, &expected, None);

        let query = r#"
        query {
            locations(storeId: \"store_b\") {
              ... on LocationConnector {
                totalCount
              }
            }
        }
        "#;
        let expected = json!({
              "locations": {
                  "totalCount": count_store_b
              }
          }
        );
        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
