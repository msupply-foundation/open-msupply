mod graphql {
    use crate::graphql::{
        common::{assert_unwrap_enum, assert_unwrap_optional_key, compare_option, get_name_inline},
        get_gql_result,
    };
    use chrono::{Duration, Utc};
    use domain::{name::NameFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::InvoiceRepository,
            schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
        },
        util::test_db,
    };
    use uuid::Uuid;

    use crate::graphql::{
        insert_inbound_shipment_full as insert, InsertInboundShipmentFull as Insert,
    };

    use insert::InsertInboundShipmentErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).insert_inbound_shipment
        };
    }

    macro_rules! assert_unwrap_invoice_response {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                insert::InsertInboundShipmentResponse::InvoiceNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                insert::InsertInboundShipmentResponse::InsertInboundShipmentError
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
    async fn test_insert_inbound_shipment() {
        let (_, connection, settings) =
            test_db::setup_all("test_insert_inbound_shipment_query", MockDataInserts::all()).await;

        // Setup
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();

        let not_supplier =
            get_name_inline!(NameFilter::new().match_is_supplier(false), &connection);
        let supplier = get_name_inline!(NameFilter::new().match_is_supplier(true), &connection);

        let base_variables = insert::Variables {
            id: Uuid::new_v4().to_string(),
            other_party_id: supplier.id.clone(),
            status: insert::InvoiceNodeStatus::Draft,
            on_hold_option: None,
            comment_option: Some("some comment_option".to_string()),
            their_reference_option: Some("some reference".to_string()),
        };

        // Test ForeingKeyError

        let mut variables = base_variables.clone();
        variables.other_party_id = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::OtherPartyId,
            },)
        );

        // Test OtherPartyNotASupplier

        let mut variables = base_variables.clone();
        variables.other_party_id = not_supplier.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let error = assert_unwrap_enum!(error_variant, OtherPartyNotASupplier);

        assert_eq!(error.other_party.id, not_supplier.id.clone());

        // Test Success

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);

        assert_eq!(new_invoice, variables);
        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);
        assert_eq!(new_invoice.confirm_datetime, None);
        assert_eq!(new_invoice.finalised_datetime, None);

        // Test Success On Hold

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.on_hold_option = Some(true);

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice, variables);

        // Test RecordAlreadyExist

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordAlreadyExist(insert::RecordAlreadyExist {
                description: "Record already exists".to_string(),
            },)
        );

        // Test Confirmed

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.status = insert::InvoiceNodeStatus::Confirmed;
        variables.comment_option = None;
        variables.their_reference_option = None;

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);

        assert_eq!(new_invoice, variables);
        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);

        let confirmed_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        assert_eq!(new_invoice.finalised_datetime, None);

        // Test Finaized

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.status = insert::InvoiceNodeStatus::Finalised;

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);
        assert_eq!(new_invoice, variables);

        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);

        let confirmed_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        let finalised_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(finalised_datetime > start);
        assert!(finalised_datetime < end);
    }

    impl From<InvoiceRowStatus> for insert::InvoiceNodeStatus {
        fn from(status: InvoiceRowStatus) -> Self {
            use insert::InvoiceNodeStatus::*;
            match status {
                InvoiceRowStatus::Draft => Draft,
                InvoiceRowStatus::Confirmed => Confirmed,
                InvoiceRowStatus::Finalised => Finalised,
            }
        }
    }

    impl PartialEq<insert::Variables> for InvoiceRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let insert::Variables {
                id,
                other_party_id,
                status,
                on_hold_option,
                comment_option,
                their_reference_option,
            } = other;

            *id == self.id
                && *other_party_id == self.name_id
                && *status == self.status.clone().into()
                && compare_option(on_hold_option, &self.on_hold)
                && *comment_option == self.comment
                && *their_reference_option == self.their_reference
        }
    }
}
