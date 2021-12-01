mod graphql {
    use crate::graphql::assert_gql_query;
    use domain::location::{Location, UpdateLocation};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        location::{update::{ UpdateLocationError}, LocationServiceTrait},
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLocationMethod =
        dyn Fn(UpdateLocation) -> Result<Location, UpdateLocationError> + Sync + Send;

    struct TestService(pub Box<UpdateLocationMethod>);

    impl LocationServiceTrait for TestService {
        fn update_location(
            &self,
            input: UpdateLocation,
            _: &ServiceContext,
        ) -> Result<Location, UpdateLocationError> {
            (self.0)(input)
        }
    }

    impl TestService {
        pub fn service_provider(
            self,
            connection_manager: StorageConnectionManager,
        ) -> ServiceProvider {
            let mut service_provider = ServiceProvider::new(connection_manager);
            service_provider.location_service = Box::new(self);
            service_provider
        }
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
            updateLocation(input: $input) {
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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(test_service.service_provider(connection_manager.clone())),
        )
        .await;

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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(test_service.service_provider(connection_manager.clone())),
        )
        .await;

        // Unique code violation
        let mutation = r#"
              mutation ($input: UpdateLocationInput!) {
                  updateLocation(input: $input) {
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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(test_service.service_provider(connection_manager.clone())),
        )
        .await;

        // Created record does not exists (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: UpdateLocationInput!) {
             updateLocation(input: $input) {
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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(test_service.service_provider(connection_manager.clone())),
        )
        .await;
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
            updateLocation(input: $input) {
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

        // Record Already Exists
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

        assert_gql_query(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(test_service.service_provider(connection_manager.clone())),
        )
        .await;
    }
}
