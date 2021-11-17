mod graphql {
    use crate::graphql::common::{assert_matches, get_invoice_lines_inline};
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        delete_inbound_shipment_full as delete, DeleteInboundShipmentFull as Delete,
    };
    use domain::{invoice::InvoiceFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use repository::mock::MockDataInserts;
    use repository::{InvoiceLineRowRepository, RepositoryError};
    use server::test_utils::setup_all;

    use delete::DeleteInboundShipmentErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).delete_inbound_shipment
        };
    }

    macro_rules! assert_unwrap_delete {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                delete::DeleteInboundShipmentResponse::DeleteResponse
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                delete::DeleteInboundShipmentResponse::DeleteInboundShipmentError
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
    async fn test_delete_inbound_shipment() {
        let (_, connection, settings) =
            setup_all("test_delete_inbound_shipment_query", MockDataInserts::all()).await;

        // Setup
        let invoice_with_lines_id = "inbound_shipment_a";
        let empty_draft_invoice_id = "empty_draft_inbound_shipment";

        let finalised_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_inbound_shipment()
                .match_finalised(),
            &connection
        );

        let outbound_shipment =
            get_invoice_inline!(InvoiceFilter::new().match_outbound_shipment(), &connection);
        let lines_in_invoice = get_invoice_lines_inline!(invoice_with_lines_id, &connection);

        let base_variables = delete::Variables {
            id: empty_draft_invoice_id.to_string(),
        };

        // Test RecordNotFound

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordNotFound(delete::RecordNotFound {
                description: "Record not found".to_string(),
            },)
        );

        // Test NotAnInboundShipment

        let mut variables = base_variables.clone();
        variables.id = outbound_shipment.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            NotAnInboundShipment(delete::NotAnInboundShipment {
                description: "Invoice is not Inbound Shipment".to_string(),
            },)
        );

        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.id = finalised_inbound_shipment.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            CannotEditFinalisedInvoice(delete::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test CannotDeleteInvoiceWithLines

        let mut variables = base_variables.clone();
        variables.id = invoice_with_lines_id.to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let error = assert_unwrap_enum!(error_variant, CannotDeleteInvoiceWithLines);
        let lines = error.lines.nodes;

        let mut api_lines: Vec<String> = lines.into_iter().map(|line| line.id).collect();

        let mut db_lines: Vec<String> = lines_in_invoice.into_iter().map(|line| line.id).collect();

        api_lines.sort();
        db_lines.sort();

        assert_eq!(api_lines, db_lines);

        // Test Success

        let mut variables = base_variables.clone();
        variables.id = empty_draft_invoice_id.to_string();

        let query = Delete::build_query(variables.clone());
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let delete_response = assert_unwrap_delete!(response);

        let deleted_invoice =
            InvoiceLineRowRepository::new(&connection).find_one_by_id(&variables.id);

        assert_eq!(
            delete_response,
            delete::DeleteResponse {
                id: variables.id.clone()
            }
        );

        assert_matches!(deleted_invoice, Err(RepositoryError::NotFound));
    }
}
