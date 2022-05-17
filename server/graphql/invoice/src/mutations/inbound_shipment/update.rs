use crate::mutations::outbound_shipment::CannotChangeStatusOfInvoiceOnHold;
use async_graphql::*;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, OtherPartyNotASupplier, OtherPartyNotVisible,
};
use graphql_core::simple_generic_errors::{CannotReverseInvoiceStatus, RecordNotFound};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::authorisation::{Resource, ResourceAccessRequest};
use service::invoice::inbound_shipment::{
    UpdateInboundShipment as ServiceInput, UpdateInboundShipmentError as ServiceError,
    UpdateInboundShipmentStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentInput")]
pub struct UpdateInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatusInput>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateInboundShipmentStatusInput {
    Delivered,
    Verified,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(service_provider.invoice_service.update_inbound_shipment(
        &service_context,
        store_id,
        &user.user_id,
        input.to_domain(),
    ))
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    OtherPartyNotVisible(OtherPartyNotVisible),
    CannotEditInvoice(CannotEditInvoice),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            other_party_id,
            status,
            on_hold,
            comment,
            their_reference,
            colour,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            status: status.map(|status| status.to_domain()),
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(invoice) => UpdateResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound))
        }
        ServiceError::CannotReverseInvoiceStatus => {
            return Ok(UpdateErrorInterface::CannotReverseInvoiceStatus(
                CannotReverseInvoiceStatus,
            ))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(CannotEditInvoice))
        }

        ServiceError::CannotChangeStatusOfInvoiceOnHold => {
            return Ok(UpdateErrorInterface::CannotChangeStatusOfInvoiceOnHold(
                CannotChangeStatusOfInvoiceOnHold,
            ))
        }
        ServiceError::OtherPartyNotASupplier => {
            return Ok(UpdateErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateInboundShipmentStatus {
        use UpdateInboundShipmentStatus::*;
        match self {
            UpdateInboundShipmentStatusInput::Delivered => Delivered,
            UpdateInboundShipmentStatusInput::Verified => Verified,
        }
    }
}

// mod graphql {
//     use crate::graphql::{
//         common::{
//             assert_unwrap_enum, assert_unwrap_optional_key, compare_option, get_invoice_inline,
//             get_invoice_lines_inline, get_name_inline,
//         },
//         get_gql_result,
//     };
//     use crate::graphql::{
//         update_inbound_shipment_full as update, UpdateInboundShipmentFull as Update,
//     };

//     use chrono::{Duration, Utc};
//     use graphql_client::{GraphQLQuery, Response};
//     use repository::{
//         mock::{
//             mock_name_linked_to_store, mock_name_not_linked_to_store, mock_store_linked_to_name,
//             MockDataInserts,
//         },
//         schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType, StockLineRow},
//         EqualFilter, InvoiceFilter, InvoiceRowRepository, NameFilter, StockLineRowRepository,
//     };
//     use server::test_utils::setup_all;

//     use update::UpdateInboundShipmentErrorInterface::*;

//     macro_rules! assert_unwrap_response_variant {
//         ($response:ident) => {
//             assert_unwrap_optional_key!($response, data).update_inbound_shipment
//         };
//     }

//     macro_rules! assert_unwrap_invoice_response {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             assert_unwrap_enum!(
//                 response_variant,
//                 update::UpdateInboundShipmentResponse::InvoiceNode
//             )
//         }};
//     }

//     macro_rules! assert_unwrap_error {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             let error_wrapper = assert_unwrap_enum!(
//                 response_variant,
//                 update::UpdateInboundShipmentResponse::UpdateInboundShipmentError
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
//     async fn test_update_inbound_shipment() {
//         let (mock_data, connection, _, settings) =
//             setup_all("test_update_inbound_shipment_query", MockDataInserts::all()).await;

//         // Setup
//         let start = Utc::now().naive_utc();
//         let end = Utc::now()
//             .naive_utc()
//             .checked_add_signed(Duration::seconds(5))
//             .unwrap();

//         let not_supplier =
//             get_name_inline!(NameFilter::new().match_is_supplier(false), &connection);
//         let supplier = get_name_inline!(
//             NameFilter::new()
//                 .match_is_supplier(true)
//                 .id(EqualFilter::equal_to("name_store_c")),
//             &connection
//         );
//         let another_name = get_name_inline!(
//             NameFilter::new()
//                 .match_is_supplier(true)
//                 .id(EqualFilter::equal_to("name_a")),
//             &connection
//         );

//         let draft_inbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::InboundShipment.equal_to())
//                 .status(InvoiceRowStatus::New.equal_to())
//                 .id(EqualFilter::equal_to("inbound_shipment_c")),
//             &connection
//         );

//         let draft_inbound_shipment_lines =
//             get_invoice_lines_inline!(&draft_inbound_shipment.invoice_row.id, &connection);
//         assert_ne!(
//             draft_inbound_shipment_lines.len(),
//             0,
//             "draft inbound shipment in this test must have at leaset one line",
//         );
//         assert_eq!(
//             draft_inbound_shipment_lines
//                 .iter()
//                 .find(|line| line.stock_line_id.is_some()),
//             None,
//             "draft inbound shipment should not have stock lines"
//         );

//         let outbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new().r#type(InvoiceRowType::OutboundShipment.equal_to()),
//             &connection
//         );

//         let base_variables = update::Variables {
//             id: draft_inbound_shipment.invoice_row.id.clone(),
//             other_party_id_option: Some(supplier.name_row.id.clone()),
//             update_inbound_status_option: None,
//             on_hold_option: None,
//             comment_option: Some("some comment".to_string()),
//             their_reference_option: Some("some reference".to_string()),
//             colour_option: None,
//         };

//         // Test RecordNotFound

//         let mut variables = base_variables.clone();
//         variables.id = "invalid".to_string();

//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             RecordNotFound(update::RecordNotFound {
//                 description: "Record not found".to_string(),
//             },)
//         );

//         // Test ForeingKeyError

//         let mut variables = base_variables.clone();
//         variables.other_party_id_option = Some("invalid".to_string());

//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             ForeignKeyError(update::ForeignKeyError {
//                 description: "FK record doesn't exist".to_string(),
//                 key: update::ForeignKey::OtherPartyId,
//             },)
//         );

//         // Test OtherPartyNotASupplier

//         let mut variables = base_variables.clone();
//         variables.other_party_id_option = Some(not_supplier.name_row.id.clone());

//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         let error = assert_unwrap_enum!(error_variant, OtherPartyNotASupplier);

//         assert_eq!(error.other_party.id, not_supplier.name_row.id.clone());

//         // Test NotAnInboundShipment

//         let mut variables = base_variables.clone();
//         variables.id = outbound_shipment.invoice_row.id.clone();

//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             NotAnInboundShipment(update::NotAnInboundShipment {
//                 description: "Invoice is not Inbound Shipment".to_string(),
//             },)
//         );

//         // Test Confirm

//         let mut variables = base_variables.clone();
//         variables.update_inbound_status_option =
//             Some(update::UpdateInboundShipmentStatusInput::Delivered);
//         variables.other_party_id_option = Some(another_name.name_row.id.clone());

//         let query = Update::build_query(variables.clone());
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let updated_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

//         assert_eq!(updated_invoice, variables);

//         let delivered_datetime = updated_invoice.delivered_datetime.unwrap();
//         assert!(delivered_datetime > start);
//         assert!(delivered_datetime < end);

//         assert_eq!(updated_invoice.verified_datetime, None);

//         for line in get_invoice_lines_inline!(&draft_inbound_shipment.invoice_row.id, &connection) {
//             let cloned_line = line.clone();
//             let stock_line_id = assert_unwrap_optional_key!(cloned_line, stock_line_id);
//             let stock_line = StockLineRowRepository::new(&connection)
//                 .find_one_by_id(&stock_line_id)
//                 .unwrap();
//             assert_eq!(line, UpdatedStockLine(stock_line));
//         }

//         // Test unchanged

//         let mut variables = base_variables.clone();

//         variables.update_inbound_status_option = None;
//         variables.comment_option = None;
//         variables.their_reference_option = None;

//         let start_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         let query = Update::build_query(variables.clone());
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let end_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(start_invoice.id, end_invoice.id);

//         // Test Success name_store_id, linked to store
//         let variables = update::Variables {
//             id: draft_inbound_shipment.invoice_row.id.clone(),
//             other_party_id_option: Some(mock_name_linked_to_store().id),
//             update_inbound_status_option: None,
//             on_hold_option: None,
//             comment_option: None,
//             their_reference_option: None,
//             colour_option: None,
//         };

//         let query = Update::build_query(variables.clone());
//         let _: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(
//             new_invoice.name_store_id,
//             Some(mock_store_linked_to_name().id)
//         );

//         // Test Success name_store_id, not_linked

//         let variables = update::Variables {
//             id: draft_inbound_shipment.invoice_row.id.clone(),
//             other_party_id_option: Some(mock_name_not_linked_to_store().id),
//             update_inbound_status_option: None,
//             on_hold_option: None,
//             comment_option: None,
//             their_reference_option: None,
//             colour_option: None,
//         };

//         let query = Update::build_query(variables.clone());
//         let _: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let new_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(new_invoice.name_store_id, None);

//         // Test Finaized (while setting invoice status onHold to true)

//         let mut variables = base_variables.clone();
//         variables.update_inbound_status_option =
//             Some(update::UpdateInboundShipmentStatusInput::Verified);
//         variables.on_hold_option = Some(true);
//         variables.colour_option = Some("#FFFFFF".to_owned());

//         let query = Update::build_query(variables.clone());
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let updated_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

//         assert_eq!(updated_invoice, variables);

//         let delivered_datetime = updated_invoice.delivered_datetime.unwrap();
//         assert!(delivered_datetime > start);
//         assert!(delivered_datetime < end);

//         let verified_datetime = updated_invoice.delivered_datetime.unwrap();
//         assert!(verified_datetime > start);
//         assert!(verified_datetime < end);

//         // Test CannotEditInvoice

//         let variables = base_variables.clone();

//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             CannotEditInvoice(update::CannotEditInvoice {
//                 description: "Cannot edit invoice".to_string(),
//             },)
//         );

//         // Test CannotChangeStatusOfInvoiceOnHold

//         let full_invoice = mock_data["base"]
//             .full_invoices
//             .get("inbound_shipment_on_hold")
//             .unwrap();

//         let mut variables = base_variables.clone();
//         variables.id = full_invoice.invoice.id.clone();
//         variables.update_inbound_status_option =
//             Some(update::UpdateInboundShipmentStatusInput::Verified);
//         let query = Update::build_query(variables);
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             CannotChangeStatusOfInvoiceOnHold(update::CannotChangeStatusOfInvoiceOnHold {
//                 description: "Invoice is on hold, status cannot be changed.".to_string(),
//             },)
//         );

//         // Test can change status if on hold is update in the same mutation

//         let full_invoice = mock_data["base"]
//             .full_invoices
//             .get("inbound_shipment_on_hold")
//             .unwrap();

//         let mut variables = base_variables.clone();
//         variables.id = full_invoice.invoice.id.clone();
//         variables.update_inbound_status_option =
//             Some(update::UpdateInboundShipmentStatusInput::Verified);
//         variables.on_hold_option = Some(false);
//         let query = Update::build_query(variables.clone());
//         let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

//         let invoice = assert_unwrap_invoice_response!(response);
//         assert_eq!(invoice.id, variables.id);

//         let updated_invoice = InvoiceRowRepository::new(&connection)
//             .find_one_by_id(&variables.id)
//             .unwrap();

//         assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

//         assert_eq!(updated_invoice, variables);
//     }

//     #[derive(Debug)]
//     struct UpdatedStockLine(StockLineRow);

//     impl From<InvoiceRowStatus> for update::UpdateInboundShipmentStatusInput {
//         fn from(status: InvoiceRowStatus) -> Self {
//             use update::UpdateInboundShipmentStatusInput::*;
//             match status {
//                 InvoiceRowStatus::Delivered => Delivered,
//                 InvoiceRowStatus::Verified => Verified,
//                 _ => panic!("no other conversions from invoice row status to UpdateInboundShipmentStatusInput")
//             }
//         }
//     }

//     impl PartialEq<UpdatedStockLine> for InvoiceLineRow {
//         fn eq(&self, other: &UpdatedStockLine) -> bool {
//             let InvoiceLineRow {
//                 id: _,
//                 invoice_id: _,
//                 item_id,
//                 item_name: _,
//                 item_code: _,
//                 stock_line_id,
//                 batch,
//                 expiry_date,
//                 pack_size,
//                 cost_price_per_pack,
//                 sell_price_per_pack,
//                 total_before_tax: _,
//                 total_after_tax: _,
//                 tax: _,
//                 r#type: _,
//                 number_of_packs,
//                 location_id,
//                 note,
//             } = self;

//             let stock_line = &other.0;

//             *item_id == stock_line.item_id
//                 && *stock_line_id.clone().unwrap() == stock_line.id
//                 && *batch == stock_line.batch
//                 && *expiry_date == stock_line.expiry_date
//                 && *pack_size == stock_line.pack_size
//                 && *cost_price_per_pack == stock_line.cost_price_per_pack
//                 && *sell_price_per_pack == stock_line.sell_price_per_pack
//                 && *number_of_packs == stock_line.available_number_of_packs
//                 && *number_of_packs == stock_line.total_number_of_packs
//                 && *note == stock_line.note
//                 && *location_id == stock_line.location_id
//         }
//     }

//     impl PartialEq<update::Variables> for InvoiceRow {
//         fn eq(&self, other: &update::Variables) -> bool {
//             let update::Variables {
//                 id,
//                 other_party_id_option,
//                 update_inbound_status_option,
//                 on_hold_option,
//                 colour_option: _,          // Nullable option ?
//                 comment_option: _,         // Nullable option ?
//                 their_reference_option: _, // Nullable option ?
//             } = other;

//             *id == self.id
//                 && compare_option(other_party_id_option, &self.name_id)
//                 && compare_option(on_hold_option, &self.on_hold)
//                 && compare_option(
//                     update_inbound_status_option,
//                     &update::UpdateInboundShipmentStatusInput::from(self.status.clone()),
//                 )
//         }
//     }
// }
