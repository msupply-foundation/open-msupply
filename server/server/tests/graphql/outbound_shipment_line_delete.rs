mod graphql {
    use crate::graphql::common::{
        assert_matches, assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
        get_invoice_lines_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        delete_outbound_shipment_line_full as delete, DeleteOutboundShipmentLineFull as Delete,
    };
    use server::test_utils::setup_all;

    use domain::{invoice::InvoiceFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use repository::{
        mock::MockDataInserts, InvoiceLineRepository, RepositoryError, StockLineRepository,
    };

    use delete::DeleteOutboundShipmentLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).delete_outbound_shipment_line
        };
    }

    macro_rules! assert_unwrap_delete {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                delete::DeleteOutboundShipmentLineResponse::DeleteResponse
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                delete::DeleteOutboundShipmentLineResponse::DeleteOutboundShipmentLineError
            );
            error_wrapper.error
        }};
    }

    macro_rules! assert_error {
        ($response:ident, $error:expr) => {{
            let lhs = assert_unwrap_error!($response);
            let rhs = $error;
            assert_eq!(lhs, rhs);
        }};
    }

    #[actix_rt::test]
    async fn test_delete_outbound_shipment_line() {
        let (_, connection, settings) = setup_all(
            "test_delete_outbound_shipment_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_outbound_shipment()
                .match_draft()
                .match_id("outbound_shipment_c"),
            &connection
        );
        let confirmed_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_outbound_shipment()
                .match_confirmed()
                .match_id("outbound_shipment_a"),
            &connection
        );
        let finalised_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_outbound_shipment()
                .match_finalised()
                .match_id("outbound_shipment_b"),
            &connection
        );
        let inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_inbound_shipment()
                .match_id("inbound_shipment_a"),
            &connection
        );
        let confirmed_invoice_lines =
            get_invoice_lines_inline!(&confirmed_outbound_shipment.id.clone(), &connection);
        let inbound_shipment_lines =
            get_invoice_lines_inline!(&inbound_shipment.id.clone(), &connection);
        let finalised_invoice_lines =
            get_invoice_lines_inline!(&finalised_outbound_shipment.id.clone(), &connection);
        let draft_invoice_lines =
            get_invoice_lines_inline!(&draft_outbound_shipment.id.clone(), &connection);

        let base_variables = delete::Variables {
            id: draft_invoice_lines[0].id.clone(),
            invoice_id: draft_outbound_shipment.id.clone(),
        };

        // Test RecordNotFound Item

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordNotFound(delete::RecordNotFound {
                description: "Record not found".to_string(),
            })
        );

        // Test ForeingKeyError Invoice

        let mut variables = base_variables.clone();
        variables.invoice_id = "invalid".to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(delete::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: delete::ForeignKey::InvoiceId,
            })
        );

        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.id = finalised_invoice_lines[0].id.clone();
        variables.invoice_id = finalised_outbound_shipment.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(delete::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotAnOutboundShipment

        let mut variables = base_variables.clone();
        variables.id = inbound_shipment_lines[0].id.clone();
        variables.invoice_id = inbound_shipment.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotAnOutboundShipment(delete::NotAnOutboundShipment {
                description: "Invoice is not Outbound Shipment".to_string(),
            })
        );

        // Test InvoiceLineBelongsToAnotherInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id = confirmed_outbound_shipment.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let invoice_variant =
            assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice).invoice;
        let invoice = assert_unwrap_enum!(invoice_variant, delete::InvoiceResponse::InvoiceNode);
        assert_eq!(invoice.id, draft_outbound_shipment.id);

        // Success Draft

        let draft_invoice_line = &draft_invoice_lines[0];

        let variables = base_variables.clone();

        let stock_line_id = draft_invoice_line.stock_line_id.as_ref().unwrap();
        let stock_line_before_deletion = StockLineRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        let query = Delete::build_query(variables.clone());

        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        let delete_response = assert_unwrap_delete!(response);

        let deleted_line = InvoiceLineRepository::new(&connection).find_one_by_id(&variables.id);

        let stock_line_after_deletion = StockLineRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        assert_eq!(
            delete_response,
            delete::DeleteResponse {
                id: variables.id.clone()
            }
        );

        assert!(matches!(deleted_line, Err(RepositoryError::NotFound)));

        assert_eq!(
            stock_line_after_deletion.available_number_of_packs,
            stock_line_before_deletion.available_number_of_packs
                + draft_invoice_line.number_of_packs
        );

        assert_eq!(
            stock_line_after_deletion.total_number_of_packs,
            stock_line_before_deletion.total_number_of_packs
        );

        // Success Confirmed

        let confirmed_invoice_line = &confirmed_invoice_lines[0];

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_line.id.clone();
        variables.invoice_id = confirmed_outbound_shipment.id.clone();

        let stock_line_id = confirmed_invoice_line.stock_line_id.as_ref().unwrap();
        let stock_line_before_deletion = StockLineRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        let query = Delete::build_query(variables.clone());
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let delete_response = assert_unwrap_delete!(response);

        let deleted_line = InvoiceLineRepository::new(&connection).find_one_by_id(&variables.id);

        let stock_line_after_deletion = StockLineRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        assert_eq!(
            delete_response,
            delete::DeleteResponse {
                id: variables.id.clone()
            }
        );

        assert_matches!(deleted_line, Err(RepositoryError::NotFound));

        assert_eq!(
            stock_line_after_deletion.available_number_of_packs,
            stock_line_before_deletion.available_number_of_packs
                + confirmed_invoice_line.number_of_packs
        );

        assert_eq!(
            stock_line_after_deletion.total_number_of_packs,
            stock_line_before_deletion.total_number_of_packs
                + confirmed_invoice_line.number_of_packs
        );
    }
}
