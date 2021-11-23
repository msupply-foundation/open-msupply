mod graphql {
    use crate::graphql::{assert_gql_query, ServicesOverride};
    use domain::{
        location::{Location, LocationFilter, LocationSort, LocationSortField},
        PaginationOption, Sort,
    };
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{location::LocationServiceQuery, ListError, ListResult};

    struct TestService<F>(pub F)
    where
        F: Fn(
            Option<PaginationOption>,
            Option<LocationFilter>,
            Option<LocationSort>,
        ) -> Result<ListResult<Location>, ListError>;

    impl<F> LocationServiceQuery for TestService<F>
    where
        F: Fn(
                Option<PaginationOption>,
                Option<LocationFilter>,
                Option<LocationSort>,
            ) -> Result<ListResult<Location>, ListError>
            + Send
            + Sync,
    {
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

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, _| {
                Ok(ListResult {
                    rows: vec![Location {
                        id: "location_on_hold".to_owned(),
                        name: "test_name".to_owned(),
                        code: "test_code".to_owned(),
                        on_hold: true,
                    }],
                    count: 1,
                })
            })));

        assert_gql_query(
            &settings,
            query,
            &None,
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test no records
        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, _| {
                Ok(ListResult {
                    rows: Vec::new(),
                    count: 0,
                })
            })));

        let expected = json!({
              "locations": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        assert_gql_query(
            &settings,
            query,
            &None,
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;
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
        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, sort| {
                assert_eq!(
                    sort,
                    Some(Sort {
                        key: LocationSortField::Name,
                        desc: None
                    })
                );
                Ok(ListResult::empty())
            })));

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
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test sort by code with desc
        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, sort| {
                assert_eq!(
                    sort,
                    Some(Sort {
                        key: LocationSortField::Code,
                        desc: Some(true)
                    })
                );
                Ok(ListResult::empty())
            })));

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
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test filter
        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, filter, _| {
                assert_eq!(filter, Some(LocationFilter::new().match_name("match_name")));
                Ok(ListResult::empty())
            })));

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
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;
    }
}
