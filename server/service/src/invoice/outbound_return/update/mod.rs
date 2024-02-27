use repository::{Invoice, RepositoryError};

use crate::{invoice::get_invoice, service_provider::ServiceContext};

use super::insert::InsertOutboundReturnLine;

pub mod generate;
pub mod validate;
// use generate::generate;
use validate::validate;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundReturnStatus {
    Allocated,
    Picked,
    Shipped,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateOutboundReturn {
    pub id: String,
    // pub other_party_id: String, // maybe?
    pub status: Option<UpdateOutboundReturnStatus>,
    pub outbound_return_lines: Vec<InsertOutboundReturnLine>,
}

#[derive(PartialEq, Debug)]
pub enum UpdateOutboundReturnError {
    ReturnDoesNotExist,
    ReturnDoesNotBelongToCurrentStore,
    ReturnIsNotEditable,
    UpdatedRecordNotFound,
    // LineUpdateError(UpdateOutboundReturnLineError),
    DatabaseError(RepositoryError),
}

// TODO: STATUS!

pub fn update_outbound_return(
    ctx: &ServiceContext,
    input: UpdateOutboundReturn, // TODO...
) -> Result<Invoice, UpdateOutboundReturnError> {
    let outbound_return = ctx
        .connection
        .transaction_sync(|connection| {
            let return_row = validate(connection, &ctx.store_id, &input.id)?;
            // let updated_return_row = generate(input, return_row);
            // OutboundReturnRepository::new(&connection).upsert_one(&updated_return_row)?;
            // generate_outbound_return_lines(&connection, &updated_return_row)?;
            // get_outbound_return(ctx, updated_return_row.id).map_err(UpdateOutboundReturnError::from)
            // let return_row = validate(ctx, &ctx.store_id, &input.id)?;

            get_invoice(ctx, None, &input.id)
                .map_err(|error| UpdateOutboundReturnError::DatabaseError(error))?
                .ok_or(UpdateOutboundReturnError::UpdatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(outbound_return)
}

impl From<RepositoryError> for UpdateOutboundReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundReturnError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice::outbound_return::update::{
            UpdateOutboundReturn, UpdateOutboundReturnError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_name_store_b, mock_store_a, mock_store_b, mock_user_account_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    };

    #[actix_rt::test]
    async fn test_update_outbound_return_errors() {
        fn base_test_return() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceRowType::OutboundReturn,
                status: InvoiceRowStatus::New,
                ..Default::default()
            }
        }
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                ..base_test_return()
            }
        }

        fn shipped_return() -> InvoiceRow {
            InvoiceRow {
                id: "shipped_return".to_string(),
                status: InvoiceRowStatus::Shipped,
                ..base_test_return()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_outbound_return_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), shipped_return()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // ReturnDoesNotExist
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: "non-existent-id".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotExist)
        );

        // ReturnDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: wrong_store().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnDoesNotBelongToCurrentStore)
        );

        // ReturnIsNotEditable
        assert_eq!(
            service_provider.invoice_service.update_outbound_return(
                &context,
                UpdateOutboundReturn {
                    id: shipped_return().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );
    }
}
