mod graphql {
    use crate::graphql::{assert_graphql_query, assert_standard_graphql_error};
    use chrono::Utc;
    use domain::invoice::{Invoice, InvoiceStatus, InvoiceType};
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        requisition::{
            response_requisition::{
                CreateRequisitionShipment as ServiceInput,
                CreateRequisitionShipmentError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod =
        dyn Fn(&str, ServiceInput) -> Result<Invoice, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn create_requisition_shipment(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<Invoice, ServiceError> {
            self.0(store_id, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "responseRequisitionId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_create_requisition_shipment_errors() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_create_requisition_shipment_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: CreateRequisitionShipmentInput!, $storeId: String) {
            createRequisitionShipment(storeId: $storeId, input: $input) {
              ... on CreateRequisitionShipmentError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "createRequisitionShipment": {
              "error": {
                "__typename": "RecordDoesNotExist"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::CannotEditRequisition)));

        let expected = json!({
            "createRequisitionShipment": {
              "error": {
                "__typename": "CannotEditRequisition"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // NothingRemainingToSupply
        let test_service =
            TestService(Box::new(|_, _| Err(ServiceError::NothingRemainingToSupply)));

        let expected = json!({
            "createRequisitionShipment": {
              "error": {
                "__typename": "NothingRemainingToSupply"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotThisStoreRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotThisStoreRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotAResponseRequisition
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::NotAResponseRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // ProblemGettingOtherParty
        let test_service =
            TestService(Box::new(|_, _| Err(ServiceError::ProblemGettingOtherParty)));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // ProblemFindingItem
        let test_service = TestService(Box::new(|_, _| Err(ServiceError::ProblemFindingItem)));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // CreatedInvoiceDoesNotExist
        let test_service = TestService(Box::new(|_, _| {
            Err(ServiceError::CreatedInvoiceDoesNotExist)
        }));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_create_requisition_shipment_success() {
        let (_, _, connection_manager, settings) = setup_all(
            "test_graphql_create_requisition_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: CreateRequisitionShipmentInput!) {
            createRequisitionShipment(storeId: $storeId, input: $input) {
                ... on InvoiceNode{
                  id
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|store_id, input| {
            assert_eq!(store_id, "store_a");
            assert_eq!(
                input,
                ServiceInput {
                    response_requisition_id: "id input".to_string(),
                }
            );
            Ok(Invoice {
                id: "new invoice id".to_string(),
                other_party_name: "n/a".to_string(),
                other_party_id: "n/a".to_string(),
                other_party_store_id: None,
                status: InvoiceStatus::New,
                on_hold: false,
                r#type: InvoiceType::OutboundShipment,
                invoice_number: 1,
                their_reference: None,
                comment: None,
                created_datetime: Utc::now().naive_utc(),
                allocated_datetime: None,
                picked_datetime: None,
                shipped_datetime: None,
                delivered_datetime: None,
                verified_datetime: None,
                colour: None,
                requisition_id: None,
            })
        }));

        let variables = json!({
          "input": {
            "responseRequisitionId": "id input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "createRequisitionShipment": {
              "id": "new invoice id"
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
