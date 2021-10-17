mod graphql {
    use crate::graphql::common::{assert_matches, get_invoice_lines_inline};
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        delete_supplier_invoice_full as delete, DeleteSupplierInvoiceFull as Delete,
    };

    use graphql_client::{GraphQLQuery, Response};
    use remote_server::database::repository::{InvoiceLineRepository, RepositoryError};
    use remote_server::{
        database::mock::MockDataInserts,
        domain::{invoice::InvoiceFilter, Pagination},
        util::test_db,
    };

    use delete::DeleteSupplierInvoiceErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).delete_supplier_invoice
        };
    }

    macro_rules! assert_unwrap_delete {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                delete::DeleteSupplierInvoiceResponse::DeleteResponse
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                delete::DeleteSupplierInvoiceResponse::DeleteSupplierInvoiceError
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
    async fn test_delete_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_delete_supplier_invoice_query", MockDataInserts::all()).await;

        // Setup
        let invoice_with_lines_id = "supplier_invoice_a";
        let empty_draft_invoice_id = "empty_draft_supplier_invoice";

        let finalised_supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_finalised(),
            &connection
        );

        let customer_invoice =
            get_invoice_inline!(InvoiceFilter::new().match_customer_invoice(), &connection);
        let lines_in_invoice = get_invoice_lines_inline!(invoice_with_lines_id, &connection);

        let base_variables = delete::Variables {
            id: empty_draft_invoice_id.to_string(),
        };

        // Test RecordDoesNotExist

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordDoesNotExist(delete::RecordDoesNotExist {
                description: "Record does not exist".to_string(),
            },)
        );

        // Test NotASupplierInvoice

        let mut variables = base_variables.clone();
        variables.id = customer_invoice.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            NotASupplierInvoice(delete::NotASupplierInvoice {
                description: "Invoice is not Supplier Invoice".to_string(),
            },)
        );

        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.id = finalised_supplier_invoice.id.clone();

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

        let deleted_invoice = InvoiceLineRepository::new(&connection).find_one_by_id(&variables.id);

        assert_eq!(
            delete_response,
            delete::DeleteResponse {
                id: variables.id.clone()
            }
        );

        assert_matches!(deleted_invoice, Err(RepositoryError::NotFound));
    }
}
