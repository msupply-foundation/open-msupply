mod graphql {
    use crate::graphql::common::{
        assert_matches, assert_unwrap_enum, assert_unwrap_optional_key,
        convert_graphql_client_type, get_invoice_inline, get_invoice_lines_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        delete_customer_invoice_line_full as delete, invoice_full as get,
        DeleteCustomerInvoiceLineFull as Delete, InvoiceFull as Get,
    };

    use graphql_client::{GraphQLQuery, Response};
    use remote_server::database::repository::RepositoryError;
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::{InvoiceLineRepository, StockLineRepository},
        },
        domain::{invoice::InvoiceFilter, Pagination},
        util::test_db,
    };

    use delete::DeleteCustomerInvoiceLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).delete_customer_invoice_line
        };
    }

    macro_rules! assert_unwrap_delete {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                delete::DeleteCustomerInvoiceLineResponse::DeleteResponse
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                delete::DeleteCustomerInvoiceLineResponse::DeleteCustomerInvoiceLineError
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
    async fn test_delete_customer_invoice_line() {
        let (_, connection, settings) = test_db::setup_all(
            "test_delete_customer_invoice_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_draft()
                .match_id("customer_invoice_c"),
            &connection
        );
        let confirmed_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_confirmed()
                .match_id("customer_invoice_a"),
            &connection
        );
        let finalised_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_finalised()
                .match_id("customer_invoice_b"),
            &connection
        );
        let supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_id("supplier_invoice_a"),
            &connection
        );
        let confirmed_invoice_lines =
            get_invoice_lines_inline!(&confirmed_customer_invoice.id.clone(), &connection);
        let supplier_invoice_lines =
            get_invoice_lines_inline!(&supplier_invoice.id.clone(), &connection);
        let finalised_invoice_lines =
            get_invoice_lines_inline!(&finalised_customer_invoice.id.clone(), &connection);
        let draft_invoice_lines =
            get_invoice_lines_inline!(&draft_customer_invoice.id.clone(), &connection);

        let base_variables = delete::Variables {
            id: draft_invoice_lines[0].id.clone(),
            invoice_id_dcil: draft_customer_invoice.id.clone(),
        };

        // Test RecordDoesNotExist Item

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordDoesNotExist(delete::RecordDoesNotExist {
                description: "Record does not exist".to_string(),
            })
        );

        // Test ForeingKeyError Invoice

        let mut variables = base_variables.clone();
        variables.invoice_id_dcil = "invalid".to_string();

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
        variables.invoice_id_dcil = finalised_customer_invoice.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(delete::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotACustomerInvoice

        let mut variables = base_variables.clone();
        variables.id = supplier_invoice_lines[0].id.clone();
        variables.invoice_id_dcil = supplier_invoice.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotACustomerInvoice(delete::NotACustomerInvoice {
                description: "Invoice is not Customer Invoice".to_string(),
            })
        );

        // Test InvoiceLineBelongsToAnotherInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id_dcil = confirmed_customer_invoice.id.clone();

        let query = Delete::build_query(variables);
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let invoice: Response<get::ResponseData> = get_gql_result(
            &settings,
            Get::build_query(get::Variables {
                id: draft_customer_invoice.id,
            }),
        )
        .await;

        assert_error!(
            response,
            InvoiceLineBelongsToAnotherInvoice(delete::InvoiceLineBelongsToAnotherInvoice {
                description: "Invoice line belongs to another invoice".to_string(),
                invoice: convert_graphql_client_type(invoice.data.unwrap().invoice)
            },)
        );

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

        // Success Confirmed

        let confirmed_invoice_line = &confirmed_invoice_lines[0];

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_line.id.clone();
        variables.invoice_id_dcil = confirmed_customer_invoice.id.clone();

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
