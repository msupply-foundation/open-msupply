use repository::EqualFilter;
use repository::{
    InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRowStatus, InvoiceRowType, ItemRow,
    ItemRowType, RepositoryError, StorageConnection,
};

use crate::invoice::check_store;
use crate::invoice_line::query::get_invoice_line;
use crate::{
    invoice::check_invoice_exists,
    invoice_line::validate::{check_item_exists, check_line_does_not_exist},
    service_provider::ServiceContext,
};
#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertOutboundShipmentUnallocatedLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub quantity: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundShipmentUnallocatedLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CanOnlyAddLinesToNewOutboundShipment,
    ItemNotFound,
    NotAStockItem,
    UnallocatedLineForItemAlreadyExistsInInvoice,
    NewlyCreatedLineDoesNotExist,
}

type OutError = InsertOutboundShipmentUnallocatedLineError;

pub fn insert_outbound_shipment_unallocated_line(
    ctx: &ServiceContext,
    input: InsertOutboundShipmentUnallocatedLine,
) -> Result<InvoiceLine, OutError> {
    let line = ctx
        .connection
        .transaction_sync(|connection| {
            let item_row = validate(connection, &ctx.store_id, &input)?;
            let new_line = generate(input, item_row)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&new_line)?;

            get_invoice_line(ctx, &new_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundShipmentUnallocatedLine,
) -> Result<ItemRow, OutError> {
    if !check_line_does_not_exist(connection, &input.id)? {
        return Err(OutError::LineAlreadyExists);
    }

    let item_row = check_item_exists(connection, &input.item_id)?.ok_or(OutError::ItemNotFound)?;

    if item_row.r#type != ItemRowType::Stock {
        return Err(OutError::NotAStockItem);
    }

    let invoice_row = check_invoice_exists(&input.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    if !check_store(&invoice_row, store_id) {
        return Err(OutError::NotThisStoreInvoice);
    }

    if invoice_row.r#type != InvoiceRowType::OutboundShipment {
        return Err(OutError::NotAnOutboundShipment);
    }

    if invoice_row.status != InvoiceRowStatus::New {
        return Err(OutError::CanOnlyAddLinesToNewOutboundShipment);
    }

    if !check_unallocated_line_does_not_exist(connection, &input.item_id, &invoice_row.id)? {
        return Err(OutError::UnallocatedLineForItemAlreadyExistsInInvoice);
    }

    Ok(item_row)
}

fn generate(
    InsertOutboundShipmentUnallocatedLine {
        id,
        invoice_id,
        item_id,
        quantity,
    }: InsertOutboundShipmentUnallocatedLine,
    item: ItemRow,
) -> Result<InvoiceLineRow, InsertOutboundShipmentUnallocatedLineError> {
    let new_line = InvoiceLineRow {
        id,
        invoice_id,
        pack_size: 1,
        number_of_packs: quantity as f64,
        item_link_id: item_id,
        item_code: item.code,
        item_name: item.name,
        r#type: InvoiceLineRowType::UnallocatedStock,

        // Default
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax: None,
        note: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        stock_line_id: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    Ok(new_line)
}

pub fn check_unallocated_line_does_not_exist(
    connection: &StorageConnection,
    item_id: &str,
    invoice_id: &str,
) -> Result<bool, RepositoryError> {
    let count = InvoiceLineRepository::new(connection).count(Some(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(item_id))
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineRowType::UnallocatedStock.equal_to()),
    ))?;

    Ok(count == 0)
}

impl From<RepositoryError> for InsertOutboundShipmentUnallocatedLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentUnallocatedLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_insert {
    use repository::{
        mock::{
            mock_allocated_invoice, mock_inbound_shipment_a, mock_item_service_item,
            mock_new_invoice_with_unallocated_line, mock_store_a, mock_store_c,
            mock_unallocated_line, mock_unallocated_line2, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, ItemRowRepository,
    };

    use crate::{
        invoice_line::{
            InsertOutboundShipmentUnallocatedLine,
            InsertOutboundShipmentUnallocatedLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let new_outbound_shipment = mock_new_invoice_with_unallocated_line();
        let existing_invoice_line = mock_unallocated_line();

        let new_line_id = "new_line".to_owned();

        // Line Already Exists
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: existing_invoice_line.id.clone(),
                    invoice_id: "".to_owned(),
                    item_id: "".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: "invalid".to_owned(),
                    item_id: "item_a".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: mock_inbound_shipment_a().id.clone(),
                    item_id: "item_a".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // CanOnlyAddLinesToNewOutboundShipment
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: mock_allocated_invoice().id.clone(),
                    item_id: "item_a".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::CanOnlyAddLinesToNewOutboundShipment)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: new_outbound_shipment.id.clone(),
                    item_id: "invalid".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::ItemNotFound)
        );
        // NotAStockItem
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: new_outbound_shipment.id.clone(),
                    item_id: mock_item_service_item().id.clone(),
                    quantity: 0
                },
            ),
            Err(ServiceError::NotAStockItem)
        );
        // NotThisStoreInvoice
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: "new unallocated line id".to_owned(),
                    invoice_id: mock_new_invoice_with_unallocated_line().id.clone(),
                    item_id: existing_invoice_line.item_link_id.clone(),
                    quantity: 0
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // UnallocatedLineForItemAlreadyExistsInInvoice
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: new_outbound_shipment.id.clone(),
                    item_id: existing_invoice_line.item_link_id.clone(),
                    quantity: 0
                },
            ),
            Err(ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_unallocated_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_unallocated_line_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Successful insert
        let invoice_id = mock_new_invoice_with_unallocated_line().id.clone();
        let item = ItemRowRepository::new(&connection)
            .find_active_by_id(&mock_unallocated_line2().item_link_id)
            .unwrap()
            .unwrap();

        let result = service
            .insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: "new_line".to_owned(),
                    invoice_id: invoice_id.clone(),
                    item_id: item.id.clone(),
                    quantity: 4,
                },
            )
            .unwrap();

        assert_eq!(result.invoice_line_row.id, "new_line");
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_old(&result.invoice_line_row.id)
                .unwrap(),
            InvoiceLineRow {
                id: "new_line".to_owned(),
                invoice_id: invoice_id.clone(),
                pack_size: 1,
                r#type: InvoiceLineRowType::UnallocatedStock,
                number_of_packs: 4.0,
                item_link_id: item.id.clone(),
                item_name: item.name.clone(),
                item_code: item.code.clone(),
                total_before_tax: 0.0,
                total_after_tax: 0.0,
                tax: None,
                note: None,
                location_id: None,
                batch: None,
                expiry_date: None,
                sell_price_per_pack: 0.0,
                cost_price_per_pack: 0.0,
                stock_line_id: None,
                inventory_adjustment_reason_id: None,
                return_reason_id: None,
                foreign_currency_price_before_tax: None,
            }
        )
    }
}
