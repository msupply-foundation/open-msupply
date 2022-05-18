use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_shipment::{
    InsertInboundShipment as ServiceInput, InsertInboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertInboundShipmentInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInboundShipmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(service_provider.invoice_service.insert_inbound_shipment(
        &service_context,
        store_id,
        &user.user_id,
        input.to_domain(),
    ))
}

#[derive(Interface)]
#[graphql(name = "InsertInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotASupplier => {
            return Ok(InsertErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

// #[cfg(test)]
// mod graphql {
//     use crate::graphql::{
//         common::{assert_unwrap_enum, assert_unwrap_optional_key, compare_option, get_name_inline},
//         get_gql_result,
//     };
//     use chrono::{Duration, Utc};
//     use graphql_client::{GraphQLQuery, Response};
//     use repository::{
//         mock::{
//             mock_inbound_shipment_number_store_a, mock_name_linked_to_store,
//             mock_name_not_linked_to_store, mock_store_linked_to_name, MockDataInserts,
//         },
//         schema::{InvoiceRow, InvoiceRowType},
//         InvoiceRowRepository, NameFilter,
//     };
//     use server::test_utils::setup_all;
//     use util::uuid::uuid;

//     use crate::graphql::{
//         insert_inbound_shipment_full as insert, InsertInboundShipmentFull as Insert,
//     };

//     use insert::InsertInboundShipmentErrorInterface::*;

//     macro_rules! assert_unwrap_response_variant {
//         ($response:ident) => {
//             assert_unwrap_optional_key!($response, data).insert_inbound_shipment
//         };
//     }

//     macro_rules! assert_unwrap_invoice_response {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             assert_unwrap_enum!(
//                 response_variant,
//                 insert::InsertInboundShipmentResponse::InvoiceNode
//             )
//         }};
//     }

//     macro_rules! assert_unwrap_error {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             let error_wrapper = assert_unwrap_enum!(
//                 response_variant,
//                 insert::InsertInboundShipmentResponse::InsertInboundShipmentError
//             );
//             error_wrapper.error
//         }};
//     }

//     macro_rules! assert_error {
//         ($response:ident, $error:expr) => {{
//             let lhs = assert_unwrap_error!($response);
//             let rhs = $error;
//             assert_eq!(lhs, rhs);
//         }};
//     }

//     #[actix_rt::test]
//     async fn test_insert_inbound_shipment() {
//         let (_, connection, _, settings) =
//             setup_all("test_insert_inbound_shipment_query", MockDataInserts::all()).await;

//         // Setup
//         let start = Utc::now().naive_utc();
//         let end = Utc::now()
//             .naive_utc()
//             .checked_add_signed(Duration::seconds(5))
//             .unwrap();

//         let starting_invoice_number = mock_inbound_shipment_number_store_a().value;

//         let not_supplier =
//             get_name_inline!(NameFilter::new().match_is_supplier(false), &connection);
//         let supplier = get_name_inline!(NameFilter::new().match_is_supplier(true), &connection);

//         let base_variables = insert::Variables {
//             id: uuid(),
//             store_id: "store_a".to_string(),
//             other_party_id: supplier.name_row.id.clone(),
//             on_hold_option: None,
//             comment_option: Some("some comment_option".to_string()),
//             their_reference_option: Some("some reference".to_string()),
//             colour_option: Some("#FFFFFF".to_owned()),
//         };

//         // Test ForeingKeyError

//         let mut variables = base_variables.clone();
//         variables.other_party_id = "invalid".to_string();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             ForeignKeyError(insert::ForeignKeyError {
//                 description: "FK record doesn't exist".to_string(),
//                 key: insert::ForeignKey::OtherPartyId,
//             },)
//         );

//         // Test OtherPartyNotASupplier

//         let mut variables = base_variables.clone();
//         variables.other_party_id = not_supplier.name_row.id.clone();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         let error = assert_unwrap_enum!(error_variant, OtherPartyNotASupplier);

//         assert_eq!(error.other_party.id, not_supplier.name_row.id.clone());

//         // Test Success
//         let variables = base_variables.clone();

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);

//         assert_eq!(new_invoice, variables);
//         assert!(new_invoice.created_datetime > start);
//         assert!(new_invoice.created_datetime < end);
//         assert_eq!(new_invoice.delivered_datetime, None);
//         assert_eq!(new_invoice.verified_datetime, None);

//         assert_eq!(new_invoice.invoice_number, starting_invoice_number + 1);

//         // Test Success On Hold

//         let mut variables = base_variables.clone();
//         variables.id = uuid();
//         variables.on_hold_option = Some(true);

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(new_invoice, variables);

//         assert_eq!(new_invoice.invoice_number, starting_invoice_number + 2);

//         // Test RecordAlreadyExist

//         let variables = base_variables.clone();

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             RecordAlreadyExist(insert::RecordAlreadyExist {
//                 description: "Record already exists".to_string(),
//             },)
//         );

//         // Test Success

//         let mut variables = base_variables.clone();
//         variables.id = uuid();
//         variables.comment_option = None;
//         variables.their_reference_option = None;

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);

//         assert_eq!(new_invoice, variables);
//         assert!(new_invoice.created_datetime > start);
//         assert!(new_invoice.created_datetime < end);

//         assert_eq!(new_invoice.delivered_datetime, None);
//         assert_eq!(new_invoice.verified_datetime, None);

//         assert_eq!(new_invoice.invoice_number, starting_invoice_number + 3);

//         // Test Success name_store_id, linked to store
//         let variables = insert::Variables {
//             id: uuid(),
//             store_id: "store_a".to_string(),
//             other_party_id: mock_name_linked_to_store().id,
//             on_hold_option: None,
//             comment_option: None,
//             their_reference_option: None,
//             colour_option: None,
//         };

//         let query = Insert::build_query(variables.clone());
//         let _: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(
//             new_invoice.name_store_id,
//             Some(mock_store_linked_to_name().id)
//         );

//         // Test Success name_store_id, not_linked
//         let variables = insert::Variables {
//             id: uuid(),
//             store_id: "store_a".to_string(),
//             other_party_id: mock_name_not_linked_to_store().id,
//             on_hold_option: None,
//             comment_option: None,
//             their_reference_option: None,
//             colour_option: None,
//         };

//         let query = Insert::build_query(variables.clone());
//         let _: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(new_invoice.name_store_id, None)
//     }

//     impl PartialEq<insert::Variables> for InvoiceRow {
//         fn eq(&self, other: &insert::Variables) -> bool {
//             let insert::Variables {
//                 id,
//                 store_id: _,
//                 other_party_id,
//                 on_hold_option,
//                 comment_option,
//                 their_reference_option,
//                 colour_option,
//             } = other;

//             *id == self.id
//                 && *other_party_id == self.name_id
//                 && compare_option(on_hold_option, &self.on_hold)
//                 && *comment_option == self.comment
//                 && *their_reference_option == self.their_reference
//                 && *colour_option == self.colour
//         }
//     }
// }
