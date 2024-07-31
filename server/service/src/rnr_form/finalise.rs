use crate::{
    activity_log::activity_log_entry, number::next_number, service_provider::ServiceContext,
};

use chrono::Utc;
use repository::{
    ActivityLogType, ItemRowRepository, NumberRowType, RepositoryError, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, RequisitionStatus,
    RequisitionType, RnRForm, RnRFormLineRowRepository, RnRFormRow, RnRFormRowRepository,
    RnRFormStatus,
};
use util::uuid::uuid;

use super::{query::get_rnr_form, validate::check_rnr_form_exists};

#[derive(Default, Debug, PartialEq, Clone)]
pub struct FinaliseRnRForm {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum FinaliseRnRFormError {
    DatabaseError(RepositoryError),
    InternalError(String),
    RnRFormDoesNotExist,
    RnRFormDoesNotBelongToStore,
    RnRFormAlreadyFinalised,
    FinalisedRnRFormDoesNotExist,
}

pub fn finalise_rnr_form(
    ctx: &ServiceContext,
    store_id: &str,
    input: FinaliseRnRForm,
) -> Result<RnRForm, FinaliseRnRFormError> {
    let rnr_form = ctx
        .connection
        .transaction_sync(|connection| {
            let rnr_form = validate(ctx, store_id, &input)?;
            let finalised_form = generate(rnr_form);

            let rnr_form_repo = RnRFormRowRepository::new(connection);

            rnr_form_repo.upsert_one(&finalised_form)?;

            // Create an internal order based on the finalised RnR form

            create_internal_order(ctx, finalised_form)?;

            // Set the status of the internal order to 'Sent'

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormFinalised,
                Some(input.id.clone()),
                None,
                None,
            )?;

            get_rnr_form(ctx, store_id, input.id)
                .map_err(FinaliseRnRFormError::DatabaseError)?
                .ok_or(FinaliseRnRFormError::FinalisedRnRFormDoesNotExist)
        })
        .map_err(|err| err.to_inner_error())?;

    Ok(rnr_form)
}

fn validate(
    ctx: &ServiceContext,
    store_id: &str,
    input: &FinaliseRnRForm,
) -> Result<RnRFormRow, FinaliseRnRFormError> {
    let connection = &ctx.connection;

    let rnr_form = check_rnr_form_exists(connection, &input.id)?
        .ok_or(FinaliseRnRFormError::RnRFormDoesNotExist)?;

    if rnr_form.store_id != store_id {
        return Err(FinaliseRnRFormError::RnRFormDoesNotBelongToStore);
    };

    if rnr_form.status == RnRFormStatus::Finalised {
        return Err(FinaliseRnRFormError::RnRFormAlreadyFinalised);
    };

    Ok(rnr_form)
}

fn generate(existing_row: RnRFormRow) -> RnRFormRow {
    let current_datetime = Utc::now().naive_utc();

    RnRFormRow {
        finalised_datetime: Some(current_datetime),
        status: RnRFormStatus::Finalised,
        ..existing_row
    }
}

impl From<RepositoryError> for FinaliseRnRFormError {
    fn from(error: RepositoryError) -> Self {
        FinaliseRnRFormError::DatabaseError(error)
    }
}

fn create_internal_order(
    ctx: &ServiceContext,
    rnr_form: RnRFormRow,
) -> Result<(), FinaliseRnRFormError> {
    // Internal Orders are known as requisitions in the code base
    let requisition_row = RequisitionRow {
        id: uuid(),
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_link_id: rnr_form.name_link_id,
        store_id: rnr_form.store_id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Sent,
        created_datetime: Utc::now().naive_utc(),
        sent_datetime: None,
        finalised_datetime: None,
        expected_delivery_date: None,
        colour: None,
        comment: Some("Automatically created from R&R Form".to_string()),
        their_reference: None,
        max_months_of_stock: 0.0,
        min_months_of_stock: 0.0,
        approval_status: None,
        linked_requisition_id: None,
        program_id: Some(rnr_form.program_id),
        period_id: Some(rnr_form.period_id),
        order_type: None, // Should we capture this in the RnR form?
    };

    let requisition_repo = RequisitionRowRepository::new(&ctx.connection);
    requisition_repo.upsert_one(&requisition_row)?;

    // Get R&R Form lines and create requisition lines

    let rnr_form_line_repo = RnRFormLineRowRepository::new(&ctx.connection);
    let requisition_line_repo = RequisitionLineRowRepository::new(&ctx.connection);
    let item_repo = ItemRowRepository::new(&ctx.connection);

    let rnr_form_lines = rnr_form_line_repo.find_many_by_rnr_form_id(&rnr_form.id)?;

    // Find all the item names
    let item_ids = rnr_form_lines
        .iter()
        .map(|rnr_form_line| rnr_form_line.item_id.clone())
        .collect();

    let items = item_repo.find_many_by_id(&item_ids)?;

    let item_map = items
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect::<std::collections::HashMap<String, _>>();

    // Loop through the rnr lines and create requisition lines

    for rnr_form_line in rnr_form_lines {
        let requisition_line = RequisitionLineRow {
            id: uuid(),
            requisition_id: requisition_row.id.clone(),
            item_link_id: rnr_form_line.item_id.clone(),
            item_name: item_map
                .get(&rnr_form_line.item_id)
                .map(|item| item.name.clone())
                .unwrap_or_default(),
            requested_quantity: rnr_form_line.requested_quantity,
            suggested_quantity: rnr_form_line.requested_quantity, // TODO This is user enterable, should we also re-calc this?
            supply_quantity: 0.0,
            available_stock_on_hand: rnr_form_line.final_balance,
            average_monthly_consumption: rnr_form_line.average_monthly_consumption,
            snapshot_datetime: rnr_form.finalised_datetime,
            approved_quantity: 0.0,
            approval_comment: None,
            comment: None,
            // TODO add Cust_pre_stock_balance, Cust_stock_received, Cust_stock_ord, Cust_stock_adj (in mSupply but no OMS Yet)
        };

        requisition_line_repo.upsert_one(&requisition_line)?;
    }

    Ok(())
}
