use domain::{invoice_line::InvoiceLine, EqualFilter};
use repository::{
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRowStatus, InvoiceRowType, ItemRow, ItemRowType,
    },
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowRepository, RepositoryError,
    StorageConnection,
};

use crate::{
    invoice::check_invoice_exists_option,
    invoice_line::{
        get_invoice_line_ctx,
        validate::{check_item_exists_option, check_line_does_not_exists_new},
    },
    service_provider::ServiceContext,
    u32_to_i32,
};

pub struct InsertOutboundShipmentUnallocatedLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub quantity: u32,
}

#[derive(Debug, PartialEq)]

pub enum InsertOutboundShipmentUnallocatedLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    //NotThisStoreInvoice,
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
            let item_row = validate(connection, &input)?;
            let new_line = generate(input, item_row)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;

            get_invoice_line_ctx(ctx, new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line)
}

fn validate(
    connection: &StorageConnection,
    input: &InsertOutboundShipmentUnallocatedLine,
) -> Result<ItemRow, OutError> {
    if !check_line_does_not_exists_new(connection, &input.id)? {
        return Err(OutError::LineAlreadyExists);
    }

    let item_row =
        check_item_exists_option(connection, &input.item_id)?.ok_or(OutError::ItemNotFound)?;

    if item_row.r#type != ItemRowType::Stock {
        return Err(OutError::NotAStockItem);
    }

    let invoice_row = check_invoice_exists_option(&input.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    // TODO:
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore

    if invoice_row.r#type != InvoiceRowType::OutboundShipment {
        return Err(OutError::NotAnOutboundShipment);
    }

    if invoice_row.status != InvoiceRowStatus::New {
        return Err(OutError::CanOnlyAddLinesToNewOutboundShipment);
    }

    if !check_unallocated_line_does_not_exist(connection, &input.item_id)? {
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
        number_of_packs: u32_to_i32(quantity),
        item_id,
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
    };

    Ok(new_line)
}

pub fn check_unallocated_line_does_not_exist(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<bool, RepositoryError> {
    let result = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(&item_id))
            .r#type(EqualFilter {
                equal_to: Some(InvoiceLineRowType::UnallocatedStock),
                not_equal_to: None,
                equal_any: None,
            }),
    )?;

    Ok(result.len() == 0)
}

impl From<RepositoryError> for InsertOutboundShipmentUnallocatedLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentUnallocatedLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_insert {

    use domain::EqualFilter;
    use repository::{
        mock::{
            mock_allocated_invoice, mock_inbound_shipment_a, mock_item_service_item,
            mock_new_invoice_with_unallocated_line, mock_unallocated_line, MockDataInserts,
        },
        schema::{InvoiceLineRow, InvoiceLineRowType, ItemRowType},
        test_db::setup_all,
        InvoiceLineRowRepository, ItemFilter, ItemQueryRepository,
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.outbound_shipment_line;

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
        // UnallocatedLineForItemAlreadyExistsInInvoice
        assert_eq!(
            service.insert_outbound_shipment_unallocated_line(
                &context,
                InsertOutboundShipmentUnallocatedLine {
                    id: new_line_id.clone(),
                    invoice_id: new_outbound_shipment.id.clone(),
                    item_id: existing_invoice_line.item_id.clone(),
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
        let service_provider = ServiceProvider::new(connection_manager.clone());
        let context = service_provider.context().unwrap();
        let service = service_provider.outbound_shipment_line;

        // Succesfull insert
        let invoice_id = mock_new_invoice_with_unallocated_line().id.clone();
        let item = ItemQueryRepository::new(&connection)
            .query_by_filter(
                ItemFilter::new()
                    .id(EqualFilter::not_equal_to(&mock_unallocated_line().item_id))
                    .r#type(EqualFilter {
                        equal_to: Some(ItemRowType::Stock),
                        not_equal_to: None,
                        equal_any: None,
                    }),
            )
            .unwrap()
            .pop()
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

        assert_eq!(result.id, "new_line");
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id(&result.id)
                .unwrap(),
            InvoiceLineRow {
                id: "new_line".to_owned(),
                invoice_id: invoice_id.clone(),
                pack_size: 1,
                r#type: InvoiceLineRowType::UnallocatedStock,
                number_of_packs: 4,
                item_id: item.id.clone(),
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
            }
        )
    }
}
