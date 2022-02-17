mod graphql {
    use crate::graphql::assert_graphql_query;
    use domain::location::{Location, UpdateLocation};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        location::{update::UpdateLocationError, LocationServiceTrait},
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLocationMethod =
        dyn Fn(UpdateLocation) -> Result<Location, UpdateLocationError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLocationMethod>);

    impl LocationServiceTrait for TestService {
        fn update_location(
            &self,
            _: &ServiceContext,
            _: &str,
            input: UpdateLocation,
        ) -> Result<Location, UpdateLocationError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        location_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.location_service = Box::new(location_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_update_location_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_location_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateLocationInput!) {
            updateLocation(input: $input, storeId: \"store_a\") {
              ... on UpdateLocationError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "code": "n/a",
            "name": "n/a",
          }
        }));

        // Record Not Found
        let test_service =
            TestService(Box::new(|_| Err(UpdateLocationError::LocationDoesNotExist)));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Not current store location
        let test_service = TestService(Box::new(|_| {
            Err(UpdateLocationError::LocationDoesNotBelongToCurrentStore)
        }));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "RecordBelongsToAnotherStore",
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Unique code violation
        let mutation = r#"
              mutation ($input: UpdateLocationInput!) {
                  updateLocation(input: $input, storeId: \"store_a\") {
                    ... on UpdateLocationError {
                      error {
                        ... on UniqueValueViolation {
                            __typename
                            field
                        }
                      }
                    }
                  }
                }
              "#;
        let test_service = TestService(Box::new(|_| Err(UpdateLocationError::CodeAlreadyExists)));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "UniqueValueViolation",
                "field": "code"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Created record does not exists (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: UpdateLocationInput!) {
             updateLocation(input: $input, storeId: \"store_a\") {
               ... on UpdateLocationError {
                 error {
                   ... on InternalError {
                       __typename
                       description
                       fullError
                   }
                 }
               }
             }
           }
         "#;

        let test_service = TestService(Box::new(|_| {
            Err(UpdateLocationError::UpdatedRecordDoesNotExist)
        }));

        let expected = json!({
            "updateLocation": {
              "error": {
                "__typename": "InternalError",
                "description": "Internal Error",
                "fullError": "Internal Error: Could not find record after updating"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_update_location_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_update_location_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateLocationInput!) {
            updateLocation(input: $input, storeId: \"store_a\") {
              ... on LocationNode {
                id
                code
                name
                onHold
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
          }
        }));

        let test_service = TestService(Box::new(|_| {
            Ok(Location {
                id: "id".to_owned(),
                name: "name".to_owned(),
                code: "code".to_owned(),
                on_hold: true,
            })
        }));

        let expected = json!({
            "updateLocation": {
                "id": "id",
                "name": "name",
                "code": "code",
                "onHold": true
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
