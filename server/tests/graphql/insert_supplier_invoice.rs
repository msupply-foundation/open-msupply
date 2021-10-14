mod graphql {
    use crate::graphql::get_gql_result;
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
    use uuid::Uuid;

    use crate::graphql::{
        insert_supplier_invoice_full as full, insert_supplier_invoice_partial as partial,
        InsertSupplierInvoiceFull as Full, InsertSupplierInvoicePartial as Partial,
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
    async fn test_insert_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_insert_supplier_invoice_query", MockDataInserts::all()).await;

        // Setup
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();
        let id1 = Uuid::new_v4().to_string();
        let id2 = Uuid::new_v4().to_string();
        let id3 = Uuid::new_v4().to_string();
        let id4 = Uuid::new_v4().to_string();
        let id5 = Uuid::new_v4().to_string();
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

        // Test ForeingKeyError

        let current_id = id1;

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_isi: "invalid".to_string(),
            status_isi: full::InvoiceNodeStatus::Draft,
            comment_isi: None,
            their_reference_isi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            insert_supplier_invoice:
                full::InsertSupplierInvoiceResponse::InsertSupplierInvoiceError(
                    full::InsertSupplierInvoiceError {
                        error: full::InsertSupplierInvoiceErrorInterface::ForeignKeyError(
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

        let current_id = id2;

        let query = Full::build_query(full::Variables {
            id: current_id,
            other_party_id_isi: not_supplier.id.clone(),
            status_isi: full::InvoiceNodeStatus::Draft,
            comment_isi: None,
            their_reference_isi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            insert_supplier_invoice:
                full::InsertSupplierInvoiceResponse::InsertSupplierInvoiceError(
                    full::InsertSupplierInvoiceError {
                        error: full::InsertSupplierInvoiceErrorInterface::OtherPartyNotASupplier(
                            full::OtherPartyNotASupplier {
                                description: "Other party name is not a supplier".to_string(),
                                other_party: not_supplier.into(),
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test Success

        let current_id = id3.clone();

        let query = Partial::build_query(partial::Variables {
            id: current_id.clone(),
            other_party_id_isi: supplier.id.clone(),
            status_isi: partial::InvoiceNodeStatus::Draft,
            comment_isi: None,
            their_reference_isi: None,
        });
        let response: Response<partial::ResponseData> = get_gql_result(&settings, query).await;
        let expected = partial::ResponseData {
            insert_supplier_invoice: partial::InsertSupplierInvoiceResponsePartial::InvoiceNode(
                partial::PartialInvoiceNode {
                    id: current_id.clone(),
                    status: partial::InvoiceNodeStatus::Draft,
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
                        .set_entry_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(invoice.id, current_id);
        assert_eq!(invoice.other_party_name, supplier.name);
        assert_eq!(invoice.confirm_datetime, None);
        assert_eq!(invoice.finalised_datetime, None);

        // Test RecordAlreadyExist

        let duplicated_id = id3;
        let query = Full::build_query(full::Variables {
            id: duplicated_id,
            other_party_id_isi: supplier.id.clone(),
            status_isi: full::InvoiceNodeStatus::Draft,
            comment_isi: None,
            their_reference_isi: None,
        });
        let response: Response<full::ResponseData> = get_gql_result(&settings, query).await;
        let expected = full::ResponseData {
            insert_supplier_invoice:
                full::InsertSupplierInvoiceResponse::InsertSupplierInvoiceError(
                    full::InsertSupplierInvoiceError {
                        error: full::InsertSupplierInvoiceErrorInterface::RecordAlreadyExist(
                            full::RecordAlreadyExist {
                                description: "Record already exists".to_string(),
                            },
                        ),
                    },
                ),
        };
        assert_eq!(response.data.unwrap(), expected);

        // Test Confirmed

        let current_id = id4;
        let query = Partial::build_query(partial::Variables {
            id: current_id.clone(),
            other_party_id_isi: supplier.id.clone(),
            status_isi: partial::InvoiceNodeStatus::Confirmed,
            comment_isi: None,
            their_reference_isi: None,
        });
        let response: Response<partial::ResponseData> = get_gql_result(&settings, query).await;
        let expected = partial::ResponseData {
            insert_supplier_invoice: partial::InsertSupplierInvoiceResponsePartial::InvoiceNode(
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
                        .set_entry_datetime(DatetimeFilter::date_range(start, end))
                        .set_confirm_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(invoice.id, current_id);
        assert_eq!(invoice.finalised_datetime, None);
        assert_eq!(invoice.comment, None);
        assert_eq!(invoice.their_reference, None);

        // Test Finaized, comment and thier_reference

        let current_id = id5;
        let query = Partial::build_query(partial::Variables {
            id: current_id.clone(),
            other_party_id_isi: supplier.id.clone(),
            status_isi: partial::InvoiceNodeStatus::Finalised,
            comment_isi: Some(comment.to_string()),
            their_reference_isi: Some(their_reference.to_string()),
        });
        let response: Response<partial::ResponseData> = get_gql_result(&settings, query).await;
        let expected = partial::ResponseData {
            insert_supplier_invoice: partial::InsertSupplierInvoiceResponsePartial::InvoiceNode(
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
                        .set_entry_datetime(DatetimeFilter::date_range(start, end))
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
    }
}
