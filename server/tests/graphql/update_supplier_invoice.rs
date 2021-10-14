mod graphql {
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        update_supplier_invoice_full as full, update_supplier_invoice_partial as partial,
        UpdateSupplierInvoiceFull as Full, UpdateSupplierInvoicePartial as Partial,
    };
    use chrono::{Duration, Utc};
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::{InvoiceQueryRepository, NameQueryRepository},
        },
        domain::{
            invoice::InvoiceFilter,
            name::{Name, NameFilter},
            DatetimeFilter, Pagination,
        },
        util::test_db,
    };

    impl From<Name> for full::NameNode {
        fn from(n: Name) -> Self {
            full::NameNode {
                code: n.code,
                id: n.id,
                is_customer: n.is_customer,
                is_supplier: n.is_supplier,
                name: n.name,
            }
        }
    }

    #[actix_rt::test]
    async fn test_update_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_update_supplier_invoice_query", MockDataInserts::all()).await;

        // Setup
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();
        let id1 = "invalid";
        let comment = "some comment";
        let their_reference = "some reference";
        let not_supplier = NameQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(NameFilter::new().match_is_supplier(false)),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        let supplier = NameQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(NameFilter::new().match_is_supplier(true)),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        let draft_supplier_invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(InvoiceFilter::new().match_supplier_invoice().match_draft()),
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

        // Test RecordDoesNotExist
        let current_id = id1.to_string();

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_usi: None,
            status_usi: None,
            comment_usi: None,
            their_reference_usi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            update_supplier_invoice:
                full::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError(
                    full::UpdateSupplierInvoiceError {
                        error: full::UpdateSupplierInvoiceErrorInterface::RecordDoesNotExist(
                            full::RecordDoesNotExist {
                                description: "Record does not exist".to_string(),
                            },
                        ),
                    },
                ),
        };
        println!("{:#?}", response);
        assert_eq!(response.data.unwrap(), expected);

        // Test ForeingKeyError
        let current_id = draft_supplier_invoice.id.clone();

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_usi: Some("invalid".to_string()),
            status_usi: None,
            comment_usi: None,
            their_reference_usi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            update_supplier_invoice:
                full::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError(
                    full::UpdateSupplierInvoiceError {
                        error: full::UpdateSupplierInvoiceErrorInterface::ForeignKeyError(
                            full::ForeignKeyError {
                                description: "FK record doesn't exist".to_string(),
                                key: full::ForeignKey::OtherPartyId,
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test OtherPartyNotASupplier

        let current_id = draft_supplier_invoice.id.clone();

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_usi: Some(not_supplier.id.clone()),
            status_usi: None,
            comment_usi: None,
            their_reference_usi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            update_supplier_invoice:
                full::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError(
                    full::UpdateSupplierInvoiceError {
                        error: full::UpdateSupplierInvoiceErrorInterface::OtherPartyNotASupplier(
                            full::OtherPartyNotASupplier {
                                description: "Other party name is not a supplier".to_string(),
                                other_party: not_supplier.into(),
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test NotASupplierInvoice

        let current_id = customer_invoice.id.clone();

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_usi: None,
            status_usi: None,
            comment_usi: None,
            their_reference_usi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            update_supplier_invoice:
                full::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError(
                    full::UpdateSupplierInvoiceError {
                        error: full::UpdateSupplierInvoiceErrorInterface::NotASupplierInvoice(
                            full::NotASupplierInvoice {
                                description: "Invoice is not Supplier Invoice".to_string(),
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test Confirm

        let current_id = draft_supplier_invoice.id.clone();

        let query = Partial::build_query(partial::Variables {
            id: current_id.clone(),
            other_party_id_usi: Some(supplier.id.clone()),
            status_usi: Some(partial::InvoiceNodeStatus::Confirmed),
            comment_usi: Some(comment.to_string()),
            their_reference_usi: Some(their_reference.to_string()),
        });
        let response: Response<partial::ResponseData> = get_gql_result(&settings, query).await;
        let expected = partial::ResponseData {
            update_supplier_invoice: partial::UpdateSupplierInvoiceResponsePartial::InvoiceNode(
                partial::PartialInvoiceNode {
                    id: current_id.clone(),
                    status: partial::InvoiceNodeStatus::Confirmed,
                    type_: partial::InvoiceNodeType::SupplierInvoice,
                },
            ),
        };
        assert_eq!(response.data.unwrap(), expected);
        let invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_id(&current_id)
                        .set_confirm_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(invoice.id, current_id);
        assert_eq!(invoice.comment, Some(comment.to_string()));
        assert_eq!(invoice.their_reference, Some(their_reference.to_string()));
        assert_eq!(invoice.finalised_datetime, None);

        // Test Finaized, comment and thier_reference

        let current_id = draft_supplier_invoice.id.clone();

        let query = Partial::build_query(partial::Variables {
            id: current_id.clone(),
            other_party_id_usi: Some(supplier.id.clone()),
            status_usi: Some(partial::InvoiceNodeStatus::Finalised),
            comment_usi: Some(comment.to_string()),
            their_reference_usi: Some(their_reference.to_string()),
        });
        let response: Response<partial::ResponseData> = get_gql_result(&settings, query).await;
        let expected = partial::ResponseData {
            update_supplier_invoice: partial::UpdateSupplierInvoiceResponsePartial::InvoiceNode(
                partial::PartialInvoiceNode {
                    id: current_id.clone(),
                    status: partial::InvoiceNodeStatus::Finalised,
                    type_: partial::InvoiceNodeType::SupplierInvoice,
                },
            ),
        };
        assert_eq!(response.data.unwrap(), expected);
        let invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_id(&current_id)
                        .set_confirm_datetime(DatetimeFilter::date_range(start, end))
                        .set_finalised_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(invoice.id, current_id);
        assert_eq!(invoice.comment, Some(comment.to_string()));
        assert_eq!(invoice.their_reference, Some(their_reference.to_string()));

        // Test CannotEditFinalisedInvoice

        let current_id = draft_supplier_invoice.id.clone();

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_usi: None,
            status_usi: None,
            comment_usi: None,
            their_reference_usi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            update_supplier_invoice:
                full::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError(
                    full::UpdateSupplierInvoiceError {
                        error:
                            full::UpdateSupplierInvoiceErrorInterface::CannotEditFinalisedInvoice(
                                full::CannotEditFinalisedInvoice {
                                    description: "Cannot edit finalised invoice".to_string(),
                                },
                            ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // TODO check stock lines updating when changed to confirmed
    }
}
