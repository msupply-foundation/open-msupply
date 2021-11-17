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
        let expected = json!({
              "locations": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, _| {
                Ok(ListResult {
                    rows: Vec::new(),
                    count: 0,
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
    }

    #[actix_rt::test]
    async fn test_graphql_locations_errors() {
        let (_, _, settings) =
            setup_all("test_graphql_location_errors", MockDataInserts::all()).await;

        let query = r#"
        query {
            locations {
              ... on ConnectorError {
                error {
                    ...on PaginationError {
                       rangeError {
                          description
                          field
                          max
                          min
                       }   
                    }
                }
              }
            }
        }
        "#;

        // Test pagination, first over limit
        let expected = json!({
              "locations": {
                "error": {
                  "rangeError": {
                    "description": "Value is above maximum",
                    "field": "first",
                    "max": 1000,
                    "min": null
                  }
                }
              }
          }
        );

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, _| {
                Err(ListError::LimitAboveMax(1000))
            })));

        assert_gql_query(
            &settings,
            query,
            &None,
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test pagination, first too small
        let expected = json!({
              "locations": {
                "error": {
                  "rangeError": {
                    "description": "Value is below minimum",
                    "field": "first",
                    "max": null,
                    "min": 1
                  }
                }
              }
          }
        );

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, _| {
                Err(ListError::LimitBelowMin(1))
            })));

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
            $page: PaginationInput
            $filter: LocationFilterInput
          ) {
            locations(sort: $sort, page: $page, filter: $filter) {
              __typename
            }
          }
          
        "#;

        let expected = json!({
              "locations": {
                  "__typename": "ConnectorError"
              }
          }
        );

        // Test sort by name no desc
        let variables = json!({
          "sort": [{
            "key": "name",
          }]
        });

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, sort| {
                assert_eq!(
                    sort,
                    Some(Sort {
                        key: LocationSortField::Name,
                        desc: None
                    })
                );
                Err(ListError::LimitAboveMax(1000))
            })));

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test sort by code with desc
        let variables = json!({
          "sort": [{
            "key": "code",
            "desc": true
          }]
        });

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, _, sort| {
                assert_eq!(
                    sort,
                    Some(Sort {
                        key: LocationSortField::Code,
                        desc: Some(true)
                    })
                );
                Err(ListError::LimitAboveMax(1000))
            })));

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test pagination
        let variables = json!({
          "page": {
            "first": 2,
            "offset": 1
          }
        });

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|page, _, _| {
                assert_eq!(
                    page,
                    Some(PaginationOption {
                        limit: Some(2),
                        offset: Some(1)
                    })
                );
                Err(ListError::LimitAboveMax(1000))
            })));

        assert_gql_query(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(ServicesOverride::new().location_service(service)),
        )
        .await;

        // Test filter
        let variables = json!({
          "filter": {
            "name": { "equalTo": "match_name"},
          }
        });

        let service: Option<Box<dyn LocationServiceQuery>> =
            Some(Box::new(TestService(|_, filter, _| {
                assert_eq!(filter, Some(LocationFilter::new().match_name("match_name")));
                Err(ListError::LimitAboveMax(1000))
            })));

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
