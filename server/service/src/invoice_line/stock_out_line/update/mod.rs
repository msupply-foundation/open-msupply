use repository::{
    InvoiceLine, InvoiceLineRow, InvoiceLineRowRepository, RepositoryError, StockLine,
    StockLineRowRepository,
};

use crate::{
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
};

mod generate;
use generate::generate;
mod validate;
use validate::validate;

use super::StockOutType;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateStockOutLine {
    pub id: String,
    pub r#type: Option<StockOutType>,
    pub item_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub number_of_packs: Option<f64>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
    pub note: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateStockOutLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    InvoiceTypeDoesNotMatch,
    NoInvoiceType,
    NotThisStoreInvoice,
    NotThisInvoiceLine(String),
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowZero,
    ItemDoesNotMatchStockLine,
    LocationIsOnHold,
    LocationNotFound,
    LineDoesNotReferenceStockLine,
    BatchIsOnHold,
    UpdatedLineDoesNotExist,
    StockLineAlreadyExistsInInvoice(String),
    ReductionBelowZero {
        stock_line_id: String,
        line_id: String,
    },
}

type OutError = UpdateStockOutLineError;

pub fn update_stock_out_line(
    ctx: &ServiceContext,
    input: UpdateStockOutLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, batch_pair, invoice) = validate(&input, &ctx.store_id, connection)?;

            let (update_line, batch_pair) = generate(input, line, item, batch_pair, invoice)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&update_line)?;

            let stock_line_repo = StockLineRowRepository::new(connection);
            stock_line_repo.upsert_one(&batch_pair.main_batch.stock_line_row)?;
            if let Some(previous_batch) = batch_pair.previous_batch_option {
                stock_line_repo.upsert_one(&previous_batch.stock_line_row)?;
            }

            get_invoice_line(ctx, &update_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(updated_line)
}

/// During outbound shipment line / prescription line update, stock line may change thus
/// validation and updates need to apply to both batches
pub struct BatchPair {
    /// Main batch to be updated
    pub main_batch: StockLine,
    /// Optional previous batch (if batch was changed)
    pub previous_batch_option: Option<StockLine>,
}

impl BatchPair {
    /// Calculate reduction amount to apply to main batch
    pub fn get_main_batch_reduction(
        &self,
        input: &UpdateStockOutLine,
        existing_line: &InvoiceLineRow,
    ) -> f64 {
        // Previous batch exists, this mean new batch was requested means:
        // - reduction should be number of packs from input (or existing line if number of pack is missing in input)
        if self.previous_batch_option.is_some() {
            input
                .number_of_packs
                .unwrap_or(existing_line.number_of_packs)
        } else {
            // Previous batch does not exists, this mean updating existing batch, thus:
            // - reduction is the difference between input and existing line number of packs
            if let Some(number_of_packs) = &input.number_of_packs {
                *number_of_packs - existing_line.number_of_packs
            } else {
                // No changes in input, no reduction
                0.0
            }
        }
    }
}

impl From<RepositoryError> for UpdateStockOutLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockOutLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_b, mock_item_b_lines, mock_outbound_shipment_a_invoice_lines,
            mock_outbound_shipment_b_invoice_lines, mock_outbound_shipment_c,
            mock_outbound_shipment_c_invoice_lines, mock_outbound_shipment_no_stock_line,
            mock_prescription_a_invoice_lines, mock_stock_line_a, mock_stock_line_b,
            mock_stock_line_location_is_on_hold, mock_stock_line_on_hold, mock_store_a,
            mock_store_b, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::update::{
            UpdateOutboundShipment, UpdateOutboundShipmentStatus,
        },
        invoice_line::stock_out_line::{
            StockOutType, UpdateStockOutLine, UpdateStockOutLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_stock_out_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_stock_out_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = "invalid".to_string();
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(10.0);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // InvoiceTypeDoesNotMatch
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(10.0);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::InvoiceTypeDoesNotMatch)
        );

        context.store_id = mock_store_c().id;
        // CannotEditFinalised
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_b_invoice_lines()[0].id.clone();
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // LineDoesNotReferenceStockLine
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_no_stock_line()[0].id.clone();
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::LineDoesNotReferenceStockLine)
        );

        context.store_id = mock_store_b().id;
        // ItemNotFound
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some("invalid".to_string());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // StockLineNotFound
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some("invalid".to_string());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::StockLineNotFound)
        );

        // NumberOfPacksBelowZero
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(-1.0);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // ItemDoesNotMatchStockLine
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_b().id.clone());
                    r.stock_line_id = Some(mock_stock_line_a().id.clone());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::ItemDoesNotMatchStockLine)
        );

        // LocationIsOnHold
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(
                        mock_stock_line_location_is_on_hold()[0]
                            .item_link_id
                            .clone(),
                    );
                    r.stock_line_id = Some(mock_stock_line_location_is_on_hold()[0].id.clone());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::LocationIsOnHold)
        );

        // BatchIsOnHold
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some(mock_stock_line_on_hold()[0].id.clone());
                    r.item_id = Some(mock_stock_line_on_hold()[0].item_link_id.clone());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::BatchIsOnHold)
        );

        // ReductionBelowZero
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(100.0);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: mock_outbound_shipment_a_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
                line_id: mock_outbound_shipment_a_invoice_lines()[0].id.clone(),
            })
        );

        // StockLineAlreadyExistsInInvoice
        assert_eq!(
            service.update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some(mock_item_b_lines()[0].id.clone());
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            ),
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                mock_outbound_shipment_a_invoice_lines()[1].id.clone()
            ))
        );
    }

    #[actix_rt::test]
    async fn update_stock_out_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_stock_out_line_success", MockDataInserts::all()).await;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.as_ref().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(stock_line_id)
                .unwrap()
        };

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;
        let invoice_service = service_provider.invoice_service;

        service
            .update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_c_invoice_lines()[0].id.clone();
                    r.r#type = Some(StockOutType::OutboundShipment);
                    r.note = Some("new note".to_string());
                }),
            )
            .unwrap();
        let updated_invoice = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id)
            .unwrap();

        assert_eq!(
            updated_invoice,
            inline_edit(&mock_outbound_shipment_c_invoice_lines()[0], |mut u| {
                u.id = mock_outbound_shipment_c_invoice_lines()[0].id.clone();
                u.note = Some("new note".to_string());
                u
            })
        );

        // New line on new outbound invoice
        let previous_available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(
                &mock_outbound_shipment_c_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
            )
            .unwrap()
            .available_number_of_packs;

        // Line before update
        let previous_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();

        service
            .update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_c_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(2.0);
                    r.total_before_tax = Some(18.00);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            )
            .unwrap();

        let outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();
        let expected_available_number_of_packs = previous_available_number_of_packs
            + previous_line.number_of_packs
            - outbound_line.number_of_packs;

        assert_eq!(
            outbound_line,
            inline_edit(&mock_outbound_shipment_c_invoice_lines()[0], |mut u| {
                u.id = mock_outbound_shipment_c_invoice_lines()[0].id.clone();
                u.number_of_packs = 2.0;
                u.total_before_tax = 18.00;
                u.total_after_tax = 18.00;
                u
            })
        );
        assert_eq!(
            expected_available_number_of_packs,
            stock_line_for_invoice_line(&outbound_line).available_number_of_packs
        );

        // Update line for Allocated invoices with different stock line
        let previous_available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(
                &mock_outbound_shipment_c_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
            )
            .unwrap()
            .available_number_of_packs;
        let new_available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_stock_line_b().id.clone())
            .unwrap()
            .available_number_of_packs;
        let previous_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();

        invoice_service
            .update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Allocated)
                }),
            )
            .unwrap();
        service
            .update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_c_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some(mock_stock_line_b().id.clone());
                    r.number_of_packs = Some(2.0);
                    r.total_before_tax = Some(10.99);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            )
            .unwrap();
        let allocated_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c_invoice_lines()[0].id.clone())
            .unwrap();
        let previous_available_number_of_packs =
            previous_available_number_of_packs + previous_line.number_of_packs;
        let new_expected_available_number_of_packs =
            new_available_number_of_packs - allocated_outbound_line.number_of_packs;

        assert_eq!(
            previous_available_number_of_packs,
            stock_line_for_invoice_line(&previous_line).available_number_of_packs
        );
        assert_eq!(
            new_expected_available_number_of_packs,
            stock_line_for_invoice_line(&allocated_outbound_line).available_number_of_packs
        );

        // Update line for Picked invoices
        let previous_totals = StockLineRowRepository::new(&connection)
            .find_one_by_id(
                &mock_outbound_shipment_a_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
            )
            .unwrap();
        let previous_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_a_invoice_lines()[0].id.clone())
            .unwrap();

        context.store_id = mock_store_b().id;
        service
            .update_stock_out_line(
                &context,
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id = mock_outbound_shipment_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(15.0);
                    r.total_before_tax = Some(10.99);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
            )
            .unwrap();
        let allocated_outbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_a_invoice_lines()[0].id.clone())
            .unwrap();
        let expected_available_number_of_packs = previous_totals.available_number_of_packs
            + previous_line.number_of_packs
            - allocated_outbound_line.number_of_packs;
        let expected_total_number_of_packs = previous_totals.total_number_of_packs
            + previous_line.number_of_packs
            - allocated_outbound_line.number_of_packs;

        assert_eq!(
            expected_available_number_of_packs,
            stock_line_for_invoice_line(&allocated_outbound_line).available_number_of_packs
        );
        assert_eq! {
            expected_total_number_of_packs,
            stock_line_for_invoice_line(&allocated_outbound_line).total_number_of_packs
        }
    }
}
