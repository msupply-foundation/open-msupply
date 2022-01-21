mod graphql {
    use chrono::Utc;
    use domain::invoice::{Invoice, InvoiceStatus, InvoiceType};
    use repository::{mock::MockDataInserts, RepositoryError, StorageConnectionManager};
    use serde_json::json;
    use server::test_utils::setup_all;
    use service::{
        invoice::InvoiceServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::graphql::assert_graphql_query;

    type GetInvoiceByNumber =
        dyn Fn(u32, InvoiceType) -> Result<Option<Invoice>, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<GetInvoiceByNumber>);

    impl InvoiceServiceTrait for TestService {
        fn get_invoice_by_number(
            &self,
            _: &ServiceContext,
            invoice_number: u32,
            r#type: InvoiceType,
        ) -> Result<Option<Invoice>, RepositoryError> {
            self.0(invoice_number, r#type)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_get_invoice_by_number() {
        let (_, _, connection_manager, settings) =
            setup_all("test_graphql_get_invoice_by_number", MockDataInserts::all()).await;

        let query = r#"
        query {
            invoiceByNumber(invoiceNumber: 0, type: INBOUND_SHIPMENT) {
              ... on NodeError {
                error {
                  __typename
                }
              }
              ... on InvoiceNode {
                id
              }
            }
          }
        "#;

        // Not found
        let test_service = TestService(Box::new(|_, _| Ok(None)));

        let expected = json!({
            "invoiceByNumber": {
              "error": {
                "__typename": "RecordNotFound"
              }
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

        // Found
        let test_service = TestService(Box::new(|_, _| {
            Ok(Some(Invoice {
                id: "test_id".to_owned(),
                other_party_name: "na".to_owned(),
                other_party_id: "na".to_owned(),
                status: InvoiceStatus::New,
                on_hold: false,
                invoice_number: 1,
                their_reference: None,
                comment: None,
                created_datetime: Utc::now().naive_utc(),
                allocated_datetime: None,
                picked_datetime: None,
                shipped_datetime: None,
                delivered_datetime: None,
                verified_datetime: None,
                color: None,
                r#type: InvoiceType::OutboundShipment,
            }))
        }));

        let expected = json!({
            "invoiceByNumber": {
                "id": "test_id"

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
}
