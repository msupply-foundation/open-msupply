use crate::{
    activity_log::activity_log_entry, number::next_number, service_provider::ServiceContext,
};

use chrono::Utc;
use repository::{
    ActivityLogType, EqualFilter, NumberRowType, RepositoryError, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, RequisitionStatus,
    RequisitionType, RnRForm, RnRFormLine, RnRFormLineFilter, RnRFormLineRepository,
    RnRFormLineRowRepository, RnRFormRow, RnRFormRowRepository, RnRFormStatus,
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
            let requisition_repo = RequisitionRowRepository::new(&ctx.connection);
            let requisition_line_repo = RequisitionLineRowRepository::new(&ctx.connection);
            let rnr_form_repo = RnRFormRowRepository::new(connection);
            let rnr_form_line_repo = RnRFormLineRowRepository::new(&ctx.connection);

            let rnr_form = validate(ctx, store_id, &input)?;

            let GenerateResult {
                requisition_row,
                finalised_rnr_form,
                rnr_form_line_and_requisition_lines,
            } = generate(ctx, rnr_form)?;

            requisition_repo.upsert_one(&requisition_row)?;
            rnr_form_repo.upsert_one(&finalised_rnr_form)?;

            for (rnr_form_line_id, requisition_line) in rnr_form_line_and_requisition_lines {
                requisition_line_repo.upsert_one(&requisition_line)?;

                rnr_form_line_repo
                    .update_requisition_line_id(&rnr_form_line_id, &requisition_line.id)?;
            }

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
) -> Result<RnRForm, FinaliseRnRFormError> {
    let connection = &ctx.connection;

    let rnr_form = check_rnr_form_exists(connection, &input.id)?
        .ok_or(FinaliseRnRFormError::RnRFormDoesNotExist)?;

    if rnr_form.rnr_form_row.store_id != store_id {
        return Err(FinaliseRnRFormError::RnRFormDoesNotBelongToStore);
    };

    if rnr_form.rnr_form_row.status == RnRFormStatus::Finalised {
        return Err(FinaliseRnRFormError::RnRFormAlreadyFinalised);
    };

    Ok(rnr_form)
}

struct GenerateResult {
    requisition_row: RequisitionRow,
    finalised_rnr_form: RnRFormRow,
    rnr_form_line_and_requisition_lines: Vec<(String, RequisitionLineRow)>,
}

fn generate(
    ctx: &ServiceContext,
    rnr_form: RnRForm,
) -> Result<GenerateResult, FinaliseRnRFormError> {
    let RnRForm {
        rnr_form_row,
        period_row,
        ..
    } = rnr_form;
    // Create an internal order based on the RnR form
    // Internal Orders are known as requisitions in the code base
    let requisition_row = RequisitionRow {
        id: uuid(),
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_link_id: rnr_form_row.name_link_id.clone(),
        store_id: rnr_form_row.store_id.clone(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Sent,
        created_datetime: Utc::now().naive_utc(),
        sent_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: None,
        expected_delivery_date: None,
        colour: None,
        comment: Some("Automatically created from R&R Form".to_string()),
        their_reference: None,
        max_months_of_stock: 0.0,
        min_months_of_stock: 0.0,
        approval_status: None,
        linked_requisition_id: None,
        program_id: Some(rnr_form_row.program_id.clone()),
        period_id: Some(rnr_form_row.period_id.clone()),
        order_type: None, // Should we capture this in the RnR form?
    };

    let rnr_form_id = rnr_form_row.id.clone();

    let current_datetime = Utc::now().naive_utc();
    let requisition_id = requisition_row.id.clone();

    let finalised_rnr_form = RnRFormRow {
        finalised_datetime: Some(current_datetime),
        status: RnRFormStatus::Finalised,
        linked_requisition_id: Some(requisition_id),
        ..rnr_form_row
    };

    // Get R&R Form lines and create requisition lines
    let rnr_form_lines = RnRFormLineRepository::new(&ctx.connection).query_by_filter(
        RnRFormLineFilter::new().rnr_form_id(EqualFilter::equal_to(&rnr_form_id)),
    )?;

    // Loop through the rnr lines and create requisition lines
    let rnr_form_closing_datetime = period_row.end_date.and_hms_opt(0, 0, 0);

    let rnr_form_line_and_requisition_lines = rnr_form_lines
        .into_iter()
        .map(
            |RnRFormLine {
                 rnr_form_line_row,
                 item_row,
                 requisition_line_row: _,
             }| {
                let requisition_line = RequisitionLineRow {
                    id: uuid(),
                    requisition_id: requisition_row.id.clone(),
                    item_link_id: rnr_form_line_row.item_link_id.clone(),
                    item_name: item_row.name,
                    requested_quantity: rnr_form_line_row
                        .entered_requested_quantity
                        .unwrap_or(rnr_form_line_row.calculated_requested_quantity),
                    suggested_quantity: rnr_form_line_row.maximum_quantity,
                    supply_quantity: 0.0,
                    available_stock_on_hand: rnr_form_line_row.final_balance,
                    average_monthly_consumption: rnr_form_line_row.average_monthly_consumption,
                    snapshot_datetime: rnr_form_closing_datetime,
                    approved_quantity: 0.0,
                    approval_comment: None,
                    comment: None,
                    // TODO add Cust_pre_stock_balance, Cust_stock_received, Cust_stock_ord, Cust_stock_adj (in mSupply but not in OMS Yet)
                };

                // Also return rnr_form_line_id, so we can update the rnr form line with the requisition line id
                (rnr_form_line_row.id, requisition_line)
            },
        )
        .collect();

    Ok(GenerateResult {
        requisition_row,
        finalised_rnr_form,
        rnr_form_line_and_requisition_lines,
    })
}

impl From<RepositoryError> for FinaliseRnRFormError {
    fn from(error: RepositoryError) -> Self {
        FinaliseRnRFormError::DatabaseError(error)
    }
}
