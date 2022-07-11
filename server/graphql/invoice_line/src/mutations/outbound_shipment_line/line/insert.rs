use async_graphql::*;

use graphql_core::generic_inputs::{PriceInput, TaxInput};
use graphql_core::simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceLineNode;

use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::ShipmentTaxUpdate;
use service::invoice_line::outbound_shipment_line::{
    InsertOutboundShipmentLine as ServiceInput, InsertOutboundShipmentLineError as ServiceError,
};

use super::{
    LocationIsOnHold, LocationNotFound, NotEnoughStockForReduction,
    StockLineAlreadyExistsInInvoice, StockLineIsOnHold,
};

#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: Option<PriceInput>,
    pub tax: Option<TaxInput>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(
        service_provider
            .invoice_line_service
            .insert_outbound_shipment_line(&service_context, store_id, input.to_domain()),
    )
}

pub fn map_response(from: Result<InvoiceLine, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    StockLineIsOnHold(StockLineIsOnHold),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            tax,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax: total_before_tax
                .and_then(|total_before_tax| total_before_tax.total_before_tax),
            tax: tax.and_then(|tax| {
                Some(ShipmentTaxUpdate {
                    percentage: tax.percentage,
                })
            }),
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::StockLineNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::StockLineId,
            )))
        }
        ServiceError::LocationIsOnHold => {
            return Ok(InsertErrorInterface::LocationIsOnHold(LocationIsOnHold {}))
        }
        ServiceError::LocationNotFound => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::LocationId,
            )))
        }
        ServiceError::StockLineAlreadyExistsInInvoice(line_id) => {
            return Ok(InsertErrorInterface::StockLineAlreadyExistsInInvoice(
                StockLineAlreadyExistsInInvoice(line_id),
            ))
        }
        ServiceError::BatchIsOnHold => {
            return Ok(InsertErrorInterface::StockLineIsOnHold(
                StockLineIsOnHold {},
            ))
        }
        ServiceError::ReductionBelowZero { stock_line_id } => {
            return Ok(InsertErrorInterface::NotEnoughStockForReduction(
                NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: None,
                },
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NumberOfPacksBelowOne => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotMatchStockLine => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

// mod graphql {
//     use crate::graphql::common::{
//         assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
//         get_invoice_line_inline, get_invoice_lines_inline, get_stock_line_inline,
//     };
//     use crate::graphql::get_gql_result;
//     use crate::graphql::{
//         insert_outbound_shipment_line_full as insert, InsertOutboundShipmentLineFull as Insert,
//     };

//     use repository::EqualFilter;

//     use graphql_client::{GraphQLQuery, Response};
//     use repository::schema::{InvoiceLineRowType, InvoiceRowStatus, InvoiceRowType};
//     use repository::InvoiceFilter;
//     use repository::{
//         mock::MockDataInserts,
//         schema::{InvoiceLineRow, StockLineRow},
//         ItemRowRepository,
//     };
//     use server::test_utils::setup_all;

//     use insert::InsertOutboundShipmentLineErrorInterface::*;
//     use util::uuid::uuid;

//     macro_rules! assert_unwrap_response_variant {
//         ($response:ident) => {
//             assert_unwrap_optional_key!($response, data).insert_outbound_shipment_line
//         };
//     }

//     macro_rules! assert_unwrap_line {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             assert_unwrap_enum!(
//                 response_variant,
//                 insert::InsertOutboundShipmentLineResponse::InvoiceLineNode
//             )
//         }};
//     }

//     macro_rules! assert_unwrap_error {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             let error_wrapper = assert_unwrap_enum!(
//                 response_variant,
//                 insert::InsertOutboundShipmentLineResponse::InsertOutboundShipmentLineError
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
//     async fn test_insert_outbound_shipment_line() {
//         let (_, connection, _, settings) = setup_all(
//             "test_insert_outbound_shipment_line_query",
//             MockDataInserts::all(),
//         )
//         .await;

//         // Setup

//         let draft_outbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::OutboundShipment.equal_to())
//                 .status(InvoiceRowStatus::New.equal_to())
//                 .id(EqualFilter::equal_to("outbound_shipment_c")),
//             &connection
//         );

//         let picked_outbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::OutboundShipment.equal_to())
//                 .status(InvoiceRowStatus::Picked.equal_to())
//                 .id(EqualFilter::equal_to("outbound_shipment_d")),
//             &connection
//         );

//         let shipped_outbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::OutboundShipment.equal_to())
//                 .status(InvoiceRowStatus::Shipped.equal_to()),
//             &connection
//         );

//         let inbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::InboundShipment.equal_to())
//                 .id(EqualFilter::equal_to("inbound_shipment_c")),
//             &connection
//         );

//         let draft_lines =
//             get_invoice_lines_inline!(&draft_outbound_shipment.invoice_row.id, &connection);

//         let supplier_lines =
//             get_invoice_lines_inline!(&inbound_shipment.invoice_row.id, &connection);
//         let item_not_in_invoices_id = "item_c".to_string();
//         let stock_line_not_in_invoices_id = "item_c_line_a".to_string();

//         let main_draft_line = draft_lines[0].clone();

//         let base_variables = insert::Variables {
//             id: uuid(),
//             invoice_id: draft_outbound_shipment.invoice_row.id.clone(),
//             item_id: item_not_in_invoices_id.clone(),
//             number_of_packs: 3,
//             stock_line_id: stock_line_not_in_invoices_id.clone(),
//             total_before_tax: 1.0,
//             total_after_tax: 1.0,
//         };

//         // Test RecordAlreadyExist

//         let mut variables = base_variables.clone();
//         variables.id = main_draft_line.id.clone();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             RecordAlreadyExist(insert::RecordAlreadyExist {
//                 description: "Record already exists".to_string(),
//             })
//         );

//         // Test ForeingKeyError Item

//         let mut variables = base_variables.clone();
//         variables.item_id = "invalid".to_string();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             ForeignKeyError(insert::ForeignKeyError {
//                 description: "FK record doesn't exist".to_string(),
//                 key: insert::ForeignKey::ItemId,
//             })
//         );

//         // Test ForeingKeyError Invoice

//         let mut variables = base_variables.clone();
//         variables.invoice_id = "invalid".to_string();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             ForeignKeyError(insert::ForeignKeyError {
//                 description: "FK record doesn't exist".to_string(),
//                 key: insert::ForeignKey::InvoiceId,
//             })
//         );

//         // Test CannotEditInvoice

//         let mut variables = base_variables.clone();
//         variables.invoice_id = shipped_outbound_shipment.invoice_row.id.clone();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             CannotEditInvoice(insert::CannotEditInvoice {
//                 description: "Cannot edit invoice".to_string(),
//             },)
//         );

//         // Test NotAnOutboundShipment

//         let mut variables = base_variables.clone();
//         variables.invoice_id = supplier_lines[0].invoice_id.clone();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             NotAnOutboundShipment(insert::NotAnOutboundShipment {
//                 description: "Invoice is not Outbound Shipment".to_string(),
//             })
//         );

//         // Test StockLineIsOnHold

//         let mut variables = base_variables.clone();
//         variables.stock_line_id = "stock_line_on_hold".to_string();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             StockLineIsOnHold(insert::StockLineIsOnHold {
//                 description: "Cannot issue from stock line that is on hold".to_string(),
//             })
//         );

//         // Test LocationIsOnHold

//         let mut variables = base_variables.clone();
//         variables.stock_line_id = "stock_line_location_is_on_hold".to_string();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             LocationIsOnHold(insert::LocationIsOnHold {
//                 description: "Cannot issue from on hold location".to_string(),
//             })
//         );

//         // Test RangeError NumberOfPacks

//         let mut variables = base_variables.clone();
//         variables.number_of_packs = 0;

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             RangeError(insert::RangeError {
//                 description: "Value is below minimum".to_string(),
//                 field: insert::RangeField::NumberOfPacks,
//                 max: None,
//                 min: Some(1),
//             })
//         );

//         // Test StockLineAlreadyExistsInInvoice

//         let mut variables = base_variables.clone();
//         variables.item_id = draft_lines[1].item_id.clone();
//         variables.stock_line_id = draft_lines[1].stock_line_id.clone().unwrap();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         let line_variant = assert_unwrap_enum!(error_variant, StockLineAlreadyExistsInInvoice).line;
//         let line = assert_unwrap_enum!(line_variant, insert::InvoiceLineResponse::InvoiceLineNode);
//         assert_eq!(line.id, draft_lines[1].id);

//         // Test NotEnoughStockForReduction

//         let stock_line = get_stock_line_inline!(&stock_line_not_in_invoices_id, &connection);

//         let mut variables = base_variables.clone();
//         variables.number_of_packs = stock_line.available_number_of_packs as i64 + 1;

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         let stock_line_variant =
//             assert_unwrap_enum!(error_variant, NotEnoughStockForReduction).batch;
//         let stock_line =
//             assert_unwrap_enum!(stock_line_variant, insert::StockLineResponse::StockLineNode);

//         assert_eq!(stock_line.id, stock_line_not_in_invoices_id);

//         // Test ItemDoesNotMatchStockLine

//         let mut variables = base_variables.clone();
//         variables.item_id = main_draft_line.item_id.clone();

//         let query = Insert::build_query(variables);
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             ItemDoesNotMatchStockLine(insert::ItemDoesNotMatchStockLine {
//                 description: "Item does not match stock line".to_string(),
//             })
//         );

//         // Test Success Draft Reduction

//         let start_stock_line = get_stock_line_inline!(&stock_line_not_in_invoices_id, &connection);
//         let number_of_packs = 1;
//         let item = ItemRowRepository::new(&connection)
//             .find_one_by_id(&item_not_in_invoices_id)
//             .unwrap()
//             .unwrap();

//         let mut variables = base_variables.clone();
//         variables.number_of_packs = number_of_packs;

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let line = assert_unwrap_line!(response);
//         assert_eq!(line.id, variables.id);

//         let new_line = get_invoice_line_inline!(&variables.id, &connection);
//         let new_stock_line = get_stock_line_inline!(&start_stock_line.id, &connection);

//         assert_eq!(new_line.number_of_packs as i64, number_of_packs);
//         assert_eq!(
//             new_stock_line.available_number_of_packs as i64,
//             start_stock_line.available_number_of_packs as i64 - number_of_packs
//         );

//         assert_eq!(
//             new_stock_line.total_number_of_packs,
//             start_stock_line.total_number_of_packs
//         );

//         assert_eq!(new_line.r#type, InvoiceLineRowType::StockOut);
//         assert_eq!(item.name, new_line.item_name);
//         assert_eq!(item.code, new_line.item_code);
//         assert_eq!(new_stock_line, FromStockLine(new_line));

//         // Test Picked Reduction

//         let start_stock_line = get_stock_line_inline!(&stock_line_not_in_invoices_id, &connection);
//         let number_of_packs = 3;
//         let item = ItemRowRepository::new(&connection)
//             .find_one_by_id(&item_not_in_invoices_id)
//             .unwrap()
//             .unwrap();

//         let mut variables = base_variables.clone();
//         variables.id = uuid();
//         variables.number_of_packs = number_of_packs;
//         variables.invoice_id = picked_outbound_shipment.invoice_row.id.clone();

//         let query = Insert::build_query(variables.clone());
//         let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

//         let line = assert_unwrap_line!(response);
//         assert_eq!(line.id, variables.id);

//         let new_line = get_invoice_line_inline!(&variables.id, &connection);
//         let new_stock_line = get_stock_line_inline!(&start_stock_line.id, &connection);

//         assert_eq!(new_line.number_of_packs as i64, number_of_packs);
//         assert_eq!(
//             new_stock_line.available_number_of_packs as i64,
//             start_stock_line.available_number_of_packs as i64 - number_of_packs
//         );

//         assert_eq!(
//             new_stock_line.total_number_of_packs as i64,
//             start_stock_line.total_number_of_packs as i64 - number_of_packs
//         );

//         assert_eq!(item.name, new_line.item_name);
//         assert_eq!(item.code, new_line.item_code);
//         assert_eq!(new_stock_line, FromStockLine(new_line));
//     }

//     #[derive(Debug)]
//     struct FromStockLine(pub InvoiceLineRow);

//     impl PartialEq<FromStockLine> for StockLineRow {
//         fn eq(&self, other: &FromStockLine) -> bool {
//             let StockLineRow {
//                 id: stock_line_id,
//                 item_id,
//                 batch,
//                 expiry_date: _,
//                 pack_size,
//                 cost_price_per_pack,
//                 sell_price_per_pack,
//                 store_id: _,
//                 available_number_of_packs: _,
//                 total_number_of_packs: _,
//                 on_hold: _,
//                 note,
//                 location_id,
//             } = self;

//             let line = &other.0;

//             *item_id == line.item_id
//                 && Some(stock_line_id.clone()) == line.stock_line_id
//                 && *batch == line.batch
//                 && *pack_size == line.pack_size
//                 && *cost_price_per_pack == line.cost_price_per_pack
//                 && *sell_price_per_pack == line.sell_price_per_pack
//                 && *note == line.note
//                 && *location_id == line.location_id
//             //    && *expiry_date == line.expiry_date
//             // TODO test fails if expiry_date in stock_line is None
//             // for some reason expiry_date is not set to None (NULL) in postgres
//             // but ok in sqlite (also setting batch to None works correctly)
//             // must be something to do with Date type
//             // https://github.com/openmsupply/remote-server/issues/482
//         }
//     }
// }
