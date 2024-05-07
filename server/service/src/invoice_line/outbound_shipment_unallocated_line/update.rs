use crate::{
    invoice::{check_invoice_exists, check_store},
    invoice_line::{query::get_invoice_line, validate::check_line_row_exists_option},
    service_provider::ServiceContext,
};
use repository::{
    InvoiceLine, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, RepositoryError,
    StorageConnection,
};
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipmentUnallocatedLine {
    pub id: String,
    pub quantity: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundShipmentUnallocatedLineError {
    LineDoesNotExist,
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    LineIsNotUnallocatedLine,
    NotThisStoreInvoice,
    UpdatedLineDoesNotExist,
}

type OutError = UpdateOutboundShipmentUnallocatedLineError;

pub fn update_outbound_shipment_unallocated_line(
    ctx: &ServiceContext,
    input: UpdateOutboundShipmentUnallocatedLine,
) -> Result<InvoiceLine, OutError> {
    let line = ctx
        .connection
        .transaction_sync(|connection| {
            let line_row = validate(connection, &ctx.store_id, &input)?;
            let updated_line = generate(input, line_row)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&updated_line)?;

            get_invoice_line(ctx, &updated_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateOutboundShipmentUnallocatedLine,
) -> Result<InvoiceLineRow, OutError> {
    let invoice_line =
        check_line_row_exists_option(connection, &input.id)?.ok_or(OutError::LineDoesNotExist)?;

    if invoice_line.r#type != InvoiceLineType::UnallocatedStock {
        return Err(OutError::LineIsNotUnallocatedLine);
    }

    let invoice_row = check_invoice_exists(&invoice_line.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    if !check_store(&invoice_row, store_id) {
        return Err(OutError::NotThisStoreInvoice);
    }

    Ok(invoice_line)
}

fn generate(
    UpdateOutboundShipmentUnallocatedLine {
        id: _,
        quantity,
    }: UpdateOutboundShipmentUnallocatedLine,
    mut line: InvoiceLineRow,
) -> Result<InvoiceLineRow, UpdateOutboundShipmentUnallocatedLineError> {
    line.number_of_packs = quantity as f64;

    Ok(line)
}

impl From<RepositoryError> for UpdateOutboundShipmentUnallocatedLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentUnallocatedLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_update {
    use repository::{
        mock::{
            mock_outbound_shipment_a_invoice_lines, mock_store_a, mock_store_c,
            mock_unallocated_line, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };

    use crate::{
        invoice_line::{
            UpdateOutboundShipmentUnallocatedLine,
            UpdateOutboundShipmentUnallocatedLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_outbound_shipment_unallocated_line(
                &context,
                UpdateOutboundShipmentUnallocatedLine {
                    id: "invalid".to_owned(),
                    quantity: 0
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LineIsNotUnallocatedLine
        assert_eq!(
            service.update_outbound_shipment_unallocated_line(
                &context,
                UpdateOutboundShipmentUnallocatedLine {
                    id: mock_outbound_shipment_a_invoice_lines()[0].id.clone(),
                    quantity: 0
                },
            ),
            Err(ServiceError::LineIsNotUnallocatedLine)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.update_outbound_shipment_unallocated_line(
                &context,
                UpdateOutboundShipmentUnallocatedLine {
                    id: mock_unallocated_line().id,
                    quantity: 0
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn update_unallocated_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_unallocated_line_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let mut line_to_update = mock_unallocated_line();
        // Successful update
        let result = service
            .update_outbound_shipment_unallocated_line(
                &context,
                UpdateOutboundShipmentUnallocatedLine {
                    id: line_to_update.id.clone(),
                    quantity: 20,
                },
            )
            .unwrap();

        assert_eq!(result.invoice_line_row.id, line_to_update.id);
        line_to_update.number_of_packs = 20.0;
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id(&result.invoice_line_row.id)
                .unwrap(),
            line_to_update
        )
    }
}
