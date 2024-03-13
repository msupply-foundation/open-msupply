#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;

    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphql_test;
    use repository::mock::MockDataInserts;
    use repository::mock::{mock_name_store_a, mock_outbound_shipment_a, mock_store_a};
    use repository::InvoiceRowType;
    use repository::{Invoice, RepositoryError, StorageConnectionManager};
    use serde_json::json;
    use service::invoice::InvoiceServiceTrait;
    use service::service_provider::{ServiceContext, ServiceProvider};

    use crate::InvoiceQueries;
    type GetInvoiceByNumber =
        dyn Fn(u32, InvoiceRowType) -> Result<Option<Invoice>, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<GetInvoiceByNumber>);

    impl InvoiceServiceTrait for TestService {
        fn get_invoice_by_number(
            &self,
            _: &ServiceContext,
            _: &str,
            invoice_number: u32,
            r#type: InvoiceRowType,
        ) -> Result<Option<Invoice>, RepositoryError> {
            self.0(invoice_number, r#type)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_get_invoice_by_number() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            InvoiceQueries,
            EmptyMutation,
            "test_graphql_get_invoice_by_number",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            invoiceByNumber(invoiceNumber: 0, type: INBOUND_SHIPMENT, storeId: \"store_a\") {
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
                invoice_row: mock_outbound_shipment_a(),
                name_row: mock_name_store_a(),
                store_row: mock_store_a(),
                clinician_row: None,
            }))
        }));

        let expected = json!({
            "invoiceByNumber": {
                "id": mock_outbound_shipment_a().id,
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
