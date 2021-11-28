mod graphql {
    use crate::graphql::{assert_gql_query, ServiceOverride};
    use domain::{
        location::{Location, LocationFilter, LocationSort},
        PaginationOption,
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
        let service_override = service_override!(|_, _, _| { Err(ListError::LimitAboveMax(1000)) });

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

        assert_gql_query(&settings, query, &None, &expected, Some(service_override)).await;

        // Test pagination, first too small
        let service_override = service_override!(|_, _, _| { Err(ListError::LimitBelowMin(1)) });

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

        assert_gql_query(&settings, query, &None, &expected, Some(service_override)).await;

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
        let service_override = service_override!(|page, _, _| {
            assert_eq!(
                page,
                Some(PaginationOption {
                    limit: Some(2),
                    offset: Some(1)
                })
            );
            Ok(ListResult::empty())
        });

        let variables = json!({
          "page": {
            "first": 2,
            "offset": 1
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
