use chrono::Utc;
use domain::{
    inbound_shipment::{
        InsertInboundShipment, InsertInboundShipmentLine, UpdateInboundShipment,
        UpdateInboundShipmentStatus,
    },
    invoice::InvoiceStatus,
    outbound_shipment::{
        InsertOutboundShipment, InsertOutboundShipmentLine, UpdateOutboundShipment,
        UpdateOutboundShipmentStatus,
    },
    EqualFilter,
};
use repository::{
    schema::{StockTakeRow, StockTakeStatus},
    RepositoryError, StockTake, StockTakeLineFilter, StockTakeLineRepository,
    StockTakeRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    invoice::{
        insert_inbound_shipment, insert_outbound_shipment, update_inbound_shipment,
        update_outbound_shipment,
    },
    invoice_line::{insert_inbound_shipment_line, insert_outbound_shipment_line},
    service_provider::ServiceContext,
    validate::check_store_id_matches,
};

use super::{query::get_stock_take, validate::check_stock_take_exist};

pub struct UpdateStockTakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<StockTakeStatus>,
}

pub enum UpdateStockTakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StockTakeDoesNotExist,
    InvalidStoreId,
    CannotEditFinalised,
}

fn check_not_finalized(status: &StockTakeStatus) -> bool {
    *status != StockTakeStatus::Finalized
}
fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockTakeInput,
) -> Result<StockTakeRow, UpdateStockTakeError> {
    let existing = match check_stock_take_exist(connection, &input.id)? {
        Some(existing) => existing,
        None => return Err(UpdateStockTakeError::StockTakeDoesNotExist),
    };
    if !check_not_finalized(&existing.status) {
        return Err(UpdateStockTakeError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(UpdateStockTakeError::InvalidStoreId);
    }

    Ok(existing)
}

struct StockTakeInboundShipment {
    shipment: InsertInboundShipment,
    lines: Vec<InsertInboundShipmentLine>,
    shipment_finalisation: UpdateInboundShipment,
}

struct StockTakeOutboundShipment {
    shipment: InsertOutboundShipment,
    lines: Vec<InsertOutboundShipmentLine>,
    shipment_finalisation: UpdateOutboundShipment,
}

struct StockTakeInvoices {
    additions: Option<StockTakeInboundShipment>,
    reductions: Option<StockTakeOutboundShipment>,
}

fn generate_invoices(
    connection: &StorageConnection,
    stock_take_id: &str,
    store_id: &str,
) -> Result<StockTakeInvoices, UpdateStockTakeError> {
    // load stock take lines and matching stock lines
    let stock_take_lines = StockTakeLineRepository::new(connection).query_by_filter(
        StockTakeLineFilter::new().stock_take_id(EqualFilter::equal_to(stock_take_id)),
    )?;

    // generate invoice line rows for additions and reductions invoices
    let mut added_inbound_lines: Vec<InsertInboundShipmentLine> = Vec::new();
    let mut added_outbound_lines: Vec<InsertOutboundShipmentLine> = Vec::new();
    let inbound_id = uuid();
    let outbound_uid = uuid();
    for stock_take_line in stock_take_lines {
        let stock_line = stock_take_line.stock_line;
        if stock_take_line.line.counted_number_of_packs > stock_line.total_number_of_packs {
            // additions
            added_inbound_lines.push(InsertInboundShipmentLine {
                id: uuid(),
                invoice_id: inbound_id.clone(),
                item_id: stock_line.item_id.clone(),
                location_id: stock_line.location_id.clone(),
                pack_size: stock_line.pack_size as u32,
                batch: stock_line.batch.clone(),
                cost_price_per_pack: stock_line.cost_price_per_pack,
                sell_price_per_pack: stock_line.sell_price_per_pack,
                expiry_date: stock_line.expiry_date,
                number_of_packs: (stock_take_line.line.counted_number_of_packs
                    - stock_line.total_number_of_packs) as u32,
                total_before_tax: 0.0,
                total_after_tax: 0.0,
                tax: None,
            });
        } else if stock_take_line.line.counted_number_of_packs < stock_line.total_number_of_packs {
            // reductions
            added_outbound_lines.push(InsertOutboundShipmentLine {
                id: uuid(),
                invoice_id: outbound_uid.clone(),
                item_id: stock_line.item_id.clone(),
                stock_line_id: stock_line.id.clone(),
                number_of_packs: (stock_line.total_number_of_packs
                    - stock_take_line.line.counted_number_of_packs)
                    as u32,
                total_before_tax: 0.0,
                total_after_tax: 0.0,
                tax: None,
            });
        }
    }

    let additions = if !added_inbound_lines.is_empty() {
        Some(StockTakeInboundShipment {
            shipment: InsertInboundShipment {
                id: inbound_id.clone(),
                other_party_id: store_id.to_string(),
                on_hold: None,
                comment: None,
                their_reference: None,
                color: None,
            },
            lines: added_inbound_lines,
            shipment_finalisation: UpdateInboundShipment {
                id: inbound_id,
                other_party_id: None,
                status: Some(UpdateInboundShipmentStatus::Verified),
                on_hold: None,
                comment: None,
                their_reference: None,
                color: None,
            },
        })
    } else {
        None
    };
    let reductions = if !added_outbound_lines.is_empty() {
        let shipment = InsertOutboundShipment {
            id: outbound_uid.clone(),
            other_party_id: store_id.to_string(),
            status: InvoiceStatus::New,
            on_hold: None,
            comment: None,
            their_reference: None,
            color: None,
        };
        Some(StockTakeOutboundShipment {
            shipment,
            lines: added_outbound_lines,
            shipment_finalisation: UpdateOutboundShipment {
                id: outbound_uid,
                other_party_id: None,
                status: Some(UpdateOutboundShipmentStatus::Shipped),
                on_hold: None,
                comment: None,
                their_reference: None,
                color: None,
            },
        })
    } else {
        None
    };

    Ok(StockTakeInvoices {
        additions,
        reductions,
    })
}

fn generate(
    connection: &StorageConnection,
    UpdateStockTakeInput {
        id,
        comment,
        description,
        status,
    }: UpdateStockTakeInput,
    existing: StockTakeRow,
) -> Result<(StockTakeRow, Option<StockTakeInvoices>), UpdateStockTakeError> {
    let mut finalised_datetime = None;
    let mut invoices = None;
    if let Some(ref status) = status {
        if *status == StockTakeStatus::Finalized {
            finalised_datetime = Some(Utc::now().naive_utc());

            invoices = Some(generate_invoices(connection, &id, &existing.store_id)?);
        }
    }
    let stock_take_row = StockTakeRow {
        id,
        store_id: existing.store_id,
        comment: comment.or(existing.comment),
        description: description.or(existing.description),
        status: status.unwrap_or(existing.status),
        created_datetime: existing.created_datetime,
        inventory_additions_id: invoices
            .as_ref()
            .and_then(|it| it.additions.as_ref())
            .map(|it| it.shipment.id.clone()),
        inventory_reductions_id: invoices
            .as_ref()
            .and_then(|it| it.reductions.as_ref())
            .map(|it| it.shipment.id.clone()),
        finalised_datetime,
    };
    Ok((stock_take_row, invoices))
}

pub fn update_stock_take(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStockTakeInput,
) -> Result<StockTake, UpdateStockTakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, store_id, &input)?;
            let (stock_take_row, shipments) = generate(connection, input, existing)?;

            // write new shipments
            if let Some(shipments) = shipments {
                if let Some(inbound) = shipments.additions {
                    // insert
                    insert_inbound_shipment(connection, inbound.shipment)
                        .map_err(|err| UpdateStockTakeError::InternalError(format!("{:?}", err)))?;
                    for line in inbound.lines {
                        insert_inbound_shipment_line(connection, line).map_err(|err| {
                            UpdateStockTakeError::InternalError(format!("{:?}", err))
                        })?;
                    }
                    update_inbound_shipment(connection, inbound.shipment_finalisation)
                        .map_err(|err| UpdateStockTakeError::InternalError(format!("{:?}", err)))?;
                }

                if let Some(outbound) = shipments.reductions {
                    // insert
                    insert_outbound_shipment(connection, outbound.shipment)
                        .map_err(|err| UpdateStockTakeError::InternalError(format!("{:?}", err)))?;
                    for line in outbound.lines {
                        insert_outbound_shipment_line(connection, line).map_err(|err| {
                            UpdateStockTakeError::InternalError(format!("{:?}", err))
                        })?;
                    }
                    update_outbound_shipment(connection, outbound.shipment_finalisation)
                        .map_err(|err| UpdateStockTakeError::InternalError(format!("{:?}", err)))?;
                }
            }
            // update stock take
            StockTakeRowRepository::new(&connection).upsert_one(&stock_take_row)?;

            let stock_take =
                get_stock_take(ctx, stock_take_row.id).map_err(UpdateStockTakeError::from)?;
            stock_take.ok_or(UpdateStockTakeError::InternalError(
                "Failed to read the just inserted stock take!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpdateStockTakeError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockTakeError::DatabaseError(error)
    }
}
