mod graphql {
    use crate::graphql::{assert_gql_query, ServicesOverride};
    use domain::{
        location::{Location, LocationFilter, LocationSort},
        PaginationOption,
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
    async fn test_graphql_locations_pagination() {
        let (_, _, settings) =
            setup_all("test_graphql_locations_pagination", MockDataInserts::all()).await;

        // Test errors
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

        // Test success
        let query = r#"
        query(
            $page: PaginationInput
          ) {
            locations(page: $page) {
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
                Ok(ListResult::empty())
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
