use repository::{
    ActivityLogType, Invoice, InvoiceRowRepository, RepositoryError, TransactionError,
};

use crate::{
    activity_log::activity_log_entry, invoice::get_invoice, service_provider::ServiceContext,
};
pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundReturn {
    pub id: String,
    pub other_party_id: String,
    pub outbound_return_lines: Vec<InsertOutboundReturnLine>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundReturnLine {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: String,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundReturnError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_outbound_return(
    ctx: &ServiceContext,
    input: InsertOutboundReturn,
) -> Result<Invoice, InsertOutboundReturnError> {
    let outbound_return: Invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let new_invoice = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                input.clone(),
                other_party,
            )?;

            InvoiceRowRepository::new(&connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.to_owned()),
                None,
                None,
            )?;

            for _line in input.outbound_return_lines {
                // insert them liiiines
            }

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| InsertOutboundReturnError::DatabaseError(error))?
                .ok_or(InsertOutboundReturnError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(outbound_return)
}

impl From<RepositoryError> for InsertOutboundReturnError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundReturnError::DatabaseError(error)
    }
}

impl From<TransactionError<InsertOutboundReturnError>> for InsertOutboundReturnError {
    fn from(error: TransactionError<InsertOutboundReturnError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                InsertOutboundReturnError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_outbound_return_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRowRepository, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_return::insert::{InsertOutboundReturn, InsertOutboundReturnError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_insert_outbound_return_errors() {
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

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_insert_outbound_return_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // InvoiceAlreadyExists
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = mock_outbound_return_a().id;
                })
            ),
            Err(InsertOutboundReturnError::InvoiceAlreadyExists)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = "does_not_exist".to_string();
                })
            ),
            Err(InsertOutboundReturnError::OtherPartyDoesNotExist)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id.clone();
                })
            ),
            Err(InsertOutboundReturnError::OtherPartyNotVisible)
        );

        // OtherPartyNotASupplier
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_a_supplier().id.clone();
                })
            ),
            Err(InsertOutboundReturnError::OtherPartyNotASupplier)
        );

        // TODO: line error?
    }

    #[actix_rt::test]
    async fn test_insert_outbound_return_success() {
        fn supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "supplier".to_string();
            })
        }

        fn supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "supplier_join".to_string();
                r.name_link_id = supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_insert_outbound_return_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_outbound_return_id".to_string();
                    r.other_party_id = supplier().id;
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_outbound_return_id")
            .unwrap();

        assert_eq!(invoice.id, "new_outbound_return_id");
        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = supplier().id;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );
    }
}
