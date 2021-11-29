mod graphql {
    use crate::graphql::{assert_gql_query, ServiceOverride};
    use domain::{
        location::{Location, LocationFilter, LocationSort, LocationSortField},
        PaginationOption, Sort,
    };
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{location::LocationQueryServiceTrait, ListError, ListResult};

    type GetLocations = dyn Fn(
            Option<PaginationOption>,
            Option<LocationFilter>,
            Option<LocationSort>,
        ) -> Result<ListResult<Location>, ListError>
        + Sync
        + Send;

    struct TestService(pub Box<GetLocations>);

    impl LocationQueryServiceTrait for TestService {
        fn get_locations(
            &self,
            pagination: Option<PaginationOption>,
            filter: Option<LocationFilter>,
            sort: Option<LocationSort>,
        ) -> Result<ListResult<Location>, ListError> {
            (self.0)(pagination, filter, sort)
        }

        fn get_location(
            &self,
            _: String,
        ) -> Result<domain::location::Location, service::SingleRecordError> {
            todo!()
        }
    }

    macro_rules! service_override {
        ($closure:expr) => {{
            ServiceOverride::new()
                .set_location_query_service(Box::new(|| Box::new(TestService(Box::new($closure)))))
        }};
    }

    #[actix_rt::test]
    async fn test_graphql_locations_success() {
        let (_, _, settings) =
            setup_all("test_graphql_locations_success", MockDataInserts::all()).await;

        let query = r#"
        query {
            locations {
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

        let service_override = service_override!(|_, _, _| {
            Ok(ListResult {
                rows: vec![Location {
                    id: "location_on_hold".to_owned(),
                    name: "test_name".to_owned(),
                    code: "test_code".to_owned(),
                    on_hold: true,
                }],
                count: 1,
            })
        });

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

        assert_gql_query(&settings, query, &None, &expected, Some(service_override)).await;

        // Test no records

        let service_override = service_override!(|_, _, _| {
            Ok(ListResult {
                rows: Vec::new(),
                count: 0,
            })
        });

        let expected = json!({
              "locations": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        assert_gql_query(&settings, query, &None, &expected, Some(service_override)).await;
    }

    #[actix_rt::test]
    async fn test_graphql_locations_inputs() {
        let (_, _, settings) =
            setup_all("test_graphql_location_inputs", MockDataInserts::all()).await;

        let query = r#"
        query(
            $sort: [LocationSortInput]
            $filter: LocationFilterInput
          ) {
            locations(sort: $sort, filter: $filter) {
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
        let service_override = service_override!(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: LocationSortField::Name,
                    desc: None
                })
            );
            Ok(ListResult::empty())
        });

        let variables = json!({
          "sort": [{
            "key": "name",
          }]
        });

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_override),
        )
        .await;

        // Test sort by code with desc
        let service_override = service_override!(|_, _, sort| {
            assert_eq!(
                sort,
                Some(Sort {
                    key: LocationSortField::Code,
                    desc: Some(true)
                })
            );
            Ok(ListResult::empty())
        });

        let variables = json!({
          "sort": [{
            "key": "code",
            "desc": true
          }]
        });

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_override),
        )
        .await;

        // Test filter
        let service_override = service_override!(|_, filter, _| {
            assert_eq!(
                filter,
                Some(LocationFilter::new().name(|f| f.equal_to(&"match_name".to_owned())))
            );
            Ok(ListResult::empty())
        });

        let variables = json!({
          "filter": {
            "name": { "equalTo": "match_name"},
          }
        });

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_override),
        )
        .await;
    }
}
