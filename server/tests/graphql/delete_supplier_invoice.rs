mod graphql {
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        delete_supplier_invoice_full as delete, DeleteSupplierInvoiceFull as Delete,
    };

    use graphql_client::{GraphQLQuery, Response};
    use remote_server::database::repository::InvoiceLineRepository;
    use remote_server::{
        database::{mock::MockDataInserts, repository::InvoiceQueryRepository},
        domain::{invoice::InvoiceFilter, Pagination},
        util::test_db,
    };
    use std::convert::TryInto;

    #[actix_rt::test]
    async fn test_delete_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_delete_supplier_invoice_query", MockDataInserts::all()).await;

        // Setup
        let id1 = "invalid";
        let invoice_with_lines_id = "supplier_invoice_a";
        let empty_draft_invoice_id = "empty_draft_supplier_invoice";

        let finalised_supplier_invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_supplier_invoice()
                        .match_finalised(),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        let customer_invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(InvoiceFilter::new().match_customer_invoice()),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        let lines_in_invoice_with_lines = InvoiceLineRepository::new(&connection)
            .find_many_by_invoice_id(&invoice_with_lines_id)
            .unwrap();

        // Test RecordDoesNotExist

        let current_id = id1.to_string();

        let query = Delete::build_query(delete::Variables { id: current_id });
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let expected = delete::ResponseData {
            delete_supplier_invoice:
                delete::DeleteSupplierInvoiceResponse::DeleteSupplierInvoiceError(
                    delete::DeleteSupplierInvoiceError {
                        error: delete::DeleteSupplierInvoiceErrorInterface::RecordDoesNotExist(
                            delete::RecordDoesNotExist {
                                description: "Record does not exist".to_string(),
                            },
                        ),
                    },
                ),
        };
        println!("{:#?}", response);
        assert_eq!(response.data.unwrap(), expected);

        // Test NotASupplierInvoice

        let current_id = customer_invoice.id.clone();

        let query = Delete::build_query(delete::Variables { id: current_id });
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let expected = delete::ResponseData {
            delete_supplier_invoice:
                delete::DeleteSupplierInvoiceResponse::DeleteSupplierInvoiceError(
                    delete::DeleteSupplierInvoiceError {
                        error: delete::DeleteSupplierInvoiceErrorInterface::NotASupplierInvoice(
                            delete::NotASupplierInvoice {
                                description: "Invoice is not Supplier Invoice".to_string(),
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test CannotEditFinalisedInvoice

        let current_id = finalised_supplier_invoice.id.clone();

        let query = Delete::build_query(delete::Variables { id: current_id });
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let expected = delete::ResponseData {
            delete_supplier_invoice:
                delete::DeleteSupplierInvoiceResponse::DeleteSupplierInvoiceError(
                    delete::DeleteSupplierInvoiceError {
                        error:
                            delete::DeleteSupplierInvoiceErrorInterface::CannotEditFinalisedInvoice(
                                delete::CannotEditFinalisedInvoice {
                                    description: "Cannot edit finalised invoice".to_string(),
                                },
                            ),
                    },
                ),
        };

        assert_eq!(response.data.unwrap(), expected);

        // Test CannotDeleteInvoiceWithLines

        let current_id = invoice_with_lines_id.to_string();

        let query = Delete::build_query(delete::Variables { id: current_id });
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

        let mut lines_count: usize = 0;
        if let delete::DeleteSupplierInvoiceResponse::DeleteSupplierInvoiceError(
            delete::DeleteSupplierInvoiceError {
                error: error_interface,
            },
        ) = response.data.unwrap().delete_supplier_invoice
        {
            if let delete::DeleteSupplierInvoiceErrorInterface::CannotDeleteInvoiceWithLines(
                delete::CannotDeleteInvoiceWithLines { lines, .. },
            ) = error_interface
            {
                if let delete::InvoiceLinesResponse::InvoiceLineConnector(
                    delete::InvoiceLineConnector { total_count, .. },
                ) = lines
                {
                    lines_count = total_count.try_into().unwrap();
                }
            }
        }

        assert_eq!(lines_count, lines_in_invoice_with_lines.len());

        // Test Success

        let current_id = empty_draft_invoice_id.to_string();

        let query = Delete::build_query(delete::Variables {
            id: current_id.clone(),
        });
        let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
        let expected = delete::ResponseData {
            delete_supplier_invoice: delete::DeleteSupplierInvoiceResponse::DeleteResponse(
                delete::DeleteResponse {
                    id: current_id.clone(),
                },
            ),
        };

        assert_eq!(response.data.unwrap(), expected);

        let deleted_invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(InvoiceFilter::new().match_id(&current_id)),
                None,
            )
            .unwrap();

        assert_eq!(0, deleted_invoice.len());
    }
}
