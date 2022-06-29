use crate::{
    log::log_entry,
    requisition::query::get_requisition,
    service_provider::ServiceContext,
    sync_processor::{process_records, Record},
};
use chrono::{NaiveDate, Utc};
use repository::{
    LogRow, LogType, RepositoryError, Requisition, RequisitionLineRowRepository,
    RequisitionRowRepository,
};

mod generate;
mod test;
mod validate;

use generate::generate;
use util::uuid::uuid;
use validate::validate;

#[derive(Debug, PartialEq, Clone)]
pub enum UpdateRequestRequistionStatus {
    Sent,
}

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateRequestRequisition {
    pub id: String,
    pub colour: Option<String>,
    pub other_party_id: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: Option<f64>,
    pub min_months_of_stock: Option<f64>,
    pub status: Option<UpdateRequestRequistionStatus>,
    pub expected_delivery_date: Option<NaiveDate>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateRequestRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    OtherPartyIsNotAStore,
    // Internal
    UpdatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
    // Cannot be an error, names are filtered so that name linked to current store is not shown
    // OtherPartyIsThisStore
}

type OutError = UpdateRequestRequisitionError;

pub fn update_request_requisition(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateRequestRequisition,
    //TODO add user_id
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let (updated_requisition, update_requisition_line_rows) =
                generate(connection, requisition_row, input.clone())?;
            RequisitionRowRepository::new(&connection).upsert_one(&updated_requisition)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(&connection);

            for requisition_line_row in update_requisition_line_rows {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            get_requisition(ctx, None, &updated_requisition.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(
            &ctx.connection,
            vec![Record::RequisitionRow(requisition.requisition_row.clone())],
        )
    );

    if input.status == Some(UpdateRequestRequistionStatus::Sent) {
        log_entry(
            &ctx.connection,
            &LogRow {
                id: uuid(),
                r#type: LogType::RequisitionStatusSent,
                user_id: None,
                store_id: Some(store_id.to_string()),
                record_id: Some(requisition.requisition_row.id.to_string()),
                datetime: Utc::now().naive_utc(),
            },
        )?;
    }

    Ok(requisition)
}

impl From<RepositoryError> for UpdateRequestRequisitionError {
    fn from(error: RepositoryError) -> Self {
        UpdateRequestRequisitionError::DatabaseError(error)
    }
}
