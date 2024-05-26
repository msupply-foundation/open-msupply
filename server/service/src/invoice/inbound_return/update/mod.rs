use crate::activity_log::{activity_log_entry, log_type_from_invoice_status};
use crate::{invoice::query::get_invoice, service_provider::ServiceContext, WithDBError};
use repository::Invoice;
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::*;
use validate::validate;

use self::generate::LineAndStockLine;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateInboundReturnStatus {
    Delivered,
    Verified,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateInboundReturn {
    pub id: String,
    pub status: Option<UpdateInboundReturnStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    // pub other_party_id: Option<String>,
}

type OutError = UpdateInboundReturnError;

pub fn update_inbound_return(
    ctx: &ServiceContext,
    patch: UpdateInboundReturn,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (existing_return, status_changed) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                updated_return,
            } = generate(connection, &ctx.user_id, existing_return, patch.clone())?;

            InvoiceRowRepository::new(connection).upsert_one(&updated_return)?;
            let invoice_line_repository = InvoiceLineRowRepository::new(connection);

            if let Some(lines_and_invoice_lines) = batches_to_update {
                let stock_line_repository = StockLineRowRepository::new(connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_repository.upsert_one(&line)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&updated_return.status, false),
                    Some(updated_return.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &updated_return.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum UpdateInboundReturnError {
    InvoiceDoesNotExist,
    NotAnInboundReturn,
    NotThisStoreInvoice,
    CannotReverseInvoiceStatus,
    ReturnIsNotEditable,
    CannotChangeStatusOfInvoiceOnHold,
    // Internal
    DatabaseError(RepositoryError),
    UpdatedInvoiceDoesNotExist,
}

impl From<RepositoryError> for UpdateInboundReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundReturnError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundReturnError
where
    ERR: Into<UpdateInboundReturnError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

impl UpdateInboundReturnStatus {
    pub fn as_invoice_row_status(&self) -> InvoiceStatus {
        match self {
            UpdateInboundReturnStatus::Delivered => InvoiceStatus::Delivered,
            UpdateInboundReturnStatus::Verified => InvoiceStatus::Verified,
        }
    }
}

impl UpdateInboundReturn {
    pub fn invoice_row_status_option(&self) -> Option<InvoiceStatus> {
        match &self.status {
            Some(status) => Some(status.as_invoice_row_status()),
            None => None,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            currency_a, mock_inbound_return_a, mock_inbound_return_b,
            mock_inbound_return_b_invoice_line_a, mock_name_store_a, mock_outbound_shipment_e,
            mock_store_a, mock_store_b, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        ActivityLogRowRepository, ActivityLogType, EqualFilter, InvoiceLineFilter,
        InvoiceLineRepository, InvoiceRow, InvoiceStatus, InvoiceType, NameRow, NameStoreJoinRow,
        StockLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice::inbound_return::{UpdateInboundReturn, UpdateInboundReturnStatus},
        service_provider::ServiceProvider,
    };

    use super::UpdateInboundReturnError;

    type ServiceError = UpdateInboundReturnError;

    #[actix_rt::test]
    async fn update_inbound_return_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_supplier".to_string();
            })
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_supplier_join".to_string();
                r.name_link_id = not_a_supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = false;
            })
        }

        fn verified_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_return".to_string(),
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_a().id,
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::InboundReturn,
                status: InvoiceStatus::Verified,
                ..Default::default()
            }
        }
        fn on_hold_return() -> InvoiceRow {
            InvoiceRow {
                id: "on_hold_return".to_string(),
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_a().id,
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::InboundReturn,
                status: InvoiceStatus::New,
                on_hold: true,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_inbound_return_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
                r.invoices = vec![verified_return(), on_hold_return()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceDoesNotExist
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = "invalid".to_string();
                })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        //NotThisStoreInvoice
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id; // store b invoice
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        //NotAnInboundReturn
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_outbound_shipment_e().id;
                })
            ),
            Err(ServiceError::NotAnInboundReturn)
        );

        //ReturnIsNotEditable
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = verified_return().id;
                })
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );

        //CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = on_hold_return().id;
                    r.status = Some(UpdateInboundReturnStatus::Delivered);
                })
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
    }

    #[actix_rt::test]
    async fn update_inbound_return_success() {
        let (_, connection, connection_manager, _) =
            setup_all("update_inbound_return_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let invoice_id = mock_inbound_return_b().id;

        /* -------
         * Setting NEW inbound return to DELIVERED
         */
        let return_line_filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&mock_inbound_return_b().id));

        let invoice_line_repo = InvoiceLineRepository::new(&connection);

        let invoice_lines = invoice_line_repo
            .query_by_filter(return_line_filter.clone())
            .unwrap();

        // Inbound return currently in NEW status, should have no stock lines
        assert!(invoice_lines
            .iter()
            .all(|l| l.invoice_line_row.stock_line_id == None));

        let updated_return = service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_id.clone();
                    r.status = Some(UpdateInboundReturnStatus::Delivered);
                }),
            )
            .unwrap();

        let return_row = updated_return.invoice_row;
        // Status has been updated
        assert_eq!(return_row.status, InvoiceStatus::Delivered);
        assert!(return_row.delivered_datetime.is_some());
        assert!(return_row.verified_datetime.is_none());

        let invoice_lines = invoice_line_repo
            .query_by_filter(return_line_filter.clone())
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let stock_line_id = invoice_lines[0]
            .invoice_line_row
            .stock_line_id
            .clone()
            .unwrap();

        let stock_line_delivered = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        // data from invoice line was added to the new stock line
        assert_eq!(
            stock_line_delivered.batch,
            mock_inbound_return_b_invoice_line_a().batch
        );

        // log is added
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&invoice_id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered);

        assert!(log.is_some());

        /* -------
         * Setting DELIVERED inbound return to VERIFIED
         */

        let updated_return = service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_id;
                    r.status = Some(UpdateInboundReturnStatus::Verified);
                }),
            )
            .unwrap();

        let return_row = updated_return.invoice_row;
        // Status has been updated
        assert_eq!(return_row.status, InvoiceStatus::Verified);
        assert!(return_row.verified_datetime.is_some());

        let invoice_lines = invoice_line_repo
            .query_by_filter(return_line_filter)
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let stock_line_id = invoice_lines[0]
            .invoice_line_row
            .stock_line_id
            .clone()
            .unwrap();

        let stock_line_verified = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        // Stock line has not changed
        assert_eq!(stock_line_delivered, stock_line_verified);
    }

    #[actix_rt::test]
    async fn update_inbound_return_success_new_to_verified() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_inbound_return_success_new_to_verified",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let invoice_id = mock_inbound_return_b().id;

        /* -------
         * Setting NEW inbound return to VERIFIED
         */
        let return_line_filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&mock_inbound_return_b().id));

        let invoice_line_repo = InvoiceLineRepository::new(&connection);

        let invoice_lines = invoice_line_repo
            .query_by_filter(return_line_filter.clone())
            .unwrap();

        // Inbound return currently in NEW status, should have no stock lines
        assert!(invoice_lines
            .iter()
            .all(|l| l.invoice_line_row.stock_line_id == None));

        let updated_return = service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_id.clone();
                    r.status = Some(UpdateInboundReturnStatus::Verified);
                }),
            )
            .unwrap();

        let return_row = updated_return.invoice_row;
        // Status has been updated
        assert_eq!(return_row.status, InvoiceStatus::Verified);
        assert!(return_row.verified_datetime.is_some());

        let invoice_lines = invoice_line_repo
            .query_by_filter(return_line_filter.clone())
            .unwrap();

        assert_eq!(invoice_lines.len(), 1);

        let stock_line_id = invoice_lines[0]
            .invoice_line_row
            .stock_line_id
            .clone()
            .unwrap();

        // check stock line was introduced
        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        // data from invoice line was added to the new stock line
        assert_eq!(
            stock_line.batch,
            mock_inbound_return_b_invoice_line_a().batch
        );
    }
}
