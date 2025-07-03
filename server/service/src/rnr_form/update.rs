use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use chrono::NaiveDate;
use repository::{
    ActivityLogType, RepositoryError, RnRForm, RnRFormLineRow, RnRFormLineRowRepository,
    RnRFormLowStock, RnRFormRow, RnRFormRowRepository, RnRFormStatus,
};

use super::{get_period_length, query::get_rnr_form, validate::check_rnr_form_exists};

#[derive(Default, Debug, PartialEq, Clone)]
pub struct UpdateRnRFormLine {
    pub id: String,
    pub quantity_received: Option<f64>,
    pub quantity_consumed: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub adjustments: Option<f64>,
    pub losses: Option<f64>,
    pub stock_out_duration: i32,
    pub adjusted_quantity_consumed: f64,
    pub average_monthly_consumption: f64,
    pub initial_balance: f64,
    pub final_balance: f64,
    pub minimum_quantity: f64,
    pub maximum_quantity: f64,
    pub calculated_requested_quantity: f64,
    pub entered_requested_quantity: Option<f64>,
    pub low_stock: RnRFormLowStock,
    pub comment: Option<String>,
    pub confirmed: bool,
}

#[derive(Default, Debug, PartialEq, Clone)]
pub struct UpdateRnRForm {
    pub id: String,
    pub lines: Vec<UpdateRnRFormLine>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateRnRFormError {
    DatabaseError(RepositoryError),
    InternalError(String),
    RnRFormDoesNotExist,
    RnRFormDoesNotBelongToStore,
    RnRFormAlreadyFinalised,
    UpdatedRnRFormDoesNotExist,
    LineError {
        line_id: String,
        error: UpdateRnRFormLineError,
    },
}

#[derive(Debug, PartialEq)]
pub enum UpdateRnRFormLineError {
    LineDoesNotExist,
    LineDoesNotBelongToRnRForm,
    ValuesDoNotBalance,
    InitialBalanceCannotBeNegative,
    FinalBalanceCannotBeNegative,
    StockOutDurationExceedsPeriod,
    CannotRequestNegativeQuantity,
}

pub fn update_rnr_form(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateRnRForm,
) -> Result<RnRForm, UpdateRnRFormError> {
    let rnr_form = ctx
        .connection
        .transaction_sync(|connection| {
            let (rnr_form, line_data) = validate(ctx, store_id, &input)?;
            let (updated_form, rnr_form_lines) = generate(input, rnr_form, line_data);

            let rnr_form_repo = RnRFormRowRepository::new(connection);
            let rnr_form_line_repo = RnRFormLineRowRepository::new(connection);

            rnr_form_repo.upsert_one(&updated_form)?;

            for line in rnr_form_lines {
                rnr_form_line_repo.upsert_one(&line)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::RnrFormUpdated,
                Some(updated_form.id.clone()),
                None,
                None,
            )?;

            get_rnr_form(ctx, store_id, updated_form.id)
                .map_err(UpdateRnRFormError::DatabaseError)?
                .ok_or(UpdateRnRFormError::UpdatedRnRFormDoesNotExist)
        })
        .map_err(|err| err.to_inner_error())?;

    Ok(rnr_form)
}

fn validate(
    ctx: &ServiceContext,
    store_id: &str,
    input: &UpdateRnRForm,
) -> Result<(RnRFormRow, Vec<(UpdateRnRFormLine, RnRFormLineRow)>), UpdateRnRFormError> {
    let connection = &ctx.connection;

    let rnr_form = check_rnr_form_exists(connection, &input.id)?
        .ok_or(UpdateRnRFormError::RnRFormDoesNotExist)?;

    if rnr_form.rnr_form_row.store_id != store_id {
        return Err(UpdateRnRFormError::RnRFormDoesNotBelongToStore);
    };

    if rnr_form.rnr_form_row.status == RnRFormStatus::Finalised {
        return Err(UpdateRnRFormError::RnRFormAlreadyFinalised);
    };

    let days_in_period = get_period_length(&rnr_form.period_row);
    let rnr_form_id = rnr_form.rnr_form_row.id.clone();

    let rnr_form_line_repo = RnRFormLineRowRepository::new(connection);
    let line_data = input
        .lines
        .clone()
        .into_iter()
        .map(|line| {
            let rnr_form_line = rnr_form_line_repo.find_one_by_id(&line.id)?.ok_or(
                UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::LineDoesNotExist,
                },
            )?;

            if rnr_form_line.rnr_form_id != rnr_form_id {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::LineDoesNotBelongToRnRForm,
                });
            }
            let UpdateRnRFormLine {
                quantity_received,
                quantity_consumed,
                adjustments,
                losses,
                final_balance,
                calculated_requested_quantity,
                entered_requested_quantity,
                initial_balance,
                stock_out_duration,
                ..
            } = line;

            let quantity_received =
                quantity_received.unwrap_or(rnr_form_line.snapshot_quantity_received);
            let quantity_consumed =
                quantity_consumed.unwrap_or(rnr_form_line.snapshot_quantity_consumed);
            let adjustments = adjustments.unwrap_or(rnr_form_line.snapshot_adjustments);
            let losses = losses.unwrap_or(0.0);

            if initial_balance + quantity_received - quantity_consumed + adjustments - losses
                != final_balance
            {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::ValuesDoNotBalance,
                });
            }

            if initial_balance < 0.0 {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::InitialBalanceCannotBeNegative,
                });
            }

            if final_balance < 0.0 {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::FinalBalanceCannotBeNegative,
                });
            }

            if stock_out_duration as i64 > days_in_period {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::StockOutDurationExceedsPeriod,
                });
            }

            if calculated_requested_quantity < 0.0
                || entered_requested_quantity.unwrap_or(0.0) < 0.0
            {
                return Err(UpdateRnRFormError::LineError {
                    line_id: line.id.clone(),
                    error: UpdateRnRFormLineError::CannotRequestNegativeQuantity,
                });
            }

            Ok((line, rnr_form_line))
        })
        .collect::<Result<Vec<(UpdateRnRFormLine, RnRFormLineRow)>, UpdateRnRFormError>>()?;

    Ok((rnr_form.rnr_form_row, line_data))
}

fn generate(
    input: UpdateRnRForm,
    rnr_form: RnRFormRow,
    line_data: Vec<(UpdateRnRFormLine, RnRFormLineRow)>,
) -> (RnRFormRow, Vec<RnRFormLineRow>) {
    let updated_rnr_form = RnRFormRow {
        their_reference: input.their_reference.or(rnr_form.their_reference),
        comment: input.comment.or(rnr_form.comment),
        ..rnr_form
    };

    let update_lines = line_data
        .into_iter()
        .map(
            |(
                UpdateRnRFormLine {
                    id: _,
                    quantity_received,
                    quantity_consumed,
                    adjustments,
                    stock_out_duration,
                    adjusted_quantity_consumed,
                    average_monthly_consumption,
                    final_balance,
                    maximum_quantity,
                    comment,
                    confirmed,
                    expiry_date,
                    initial_balance,
                    calculated_requested_quantity,
                    entered_requested_quantity,
                    low_stock,
                    losses,
                    minimum_quantity,
                },
                RnRFormLineRow {
                    id,
                    rnr_form_id,
                    item_link_id,
                    requisition_line_id: requisition_id,
                    snapshot_quantity_received,
                    snapshot_quantity_consumed,
                    snapshot_adjustments,
                    previous_monthly_consumption_values,
                    initial_balance: _,
                    expiry_date: _,
                    average_monthly_consumption: _,
                    entered_quantity_received: _,
                    entered_quantity_consumed: _,
                    entered_adjustments: _,
                    adjusted_quantity_consumed: _,
                    stock_out_duration: _,
                    final_balance: _,
                    maximum_quantity: _,
                    calculated_requested_quantity: _,
                    entered_requested_quantity: _,
                    comment: _,
                    confirmed: _,
                    low_stock: _,
                    entered_losses: _,
                    minimum_quantity: _,
                },
            )| {
                RnRFormLineRow {
                    id,
                    entered_quantity_received: quantity_received,
                    entered_quantity_consumed: quantity_consumed,
                    entered_adjustments: adjustments,
                    entered_losses: losses,
                    average_monthly_consumption,
                    stock_out_duration,
                    adjusted_quantity_consumed,
                    initial_balance, // TODO; snapshot and entered?
                    final_balance,
                    maximum_quantity,
                    minimum_quantity,
                    calculated_requested_quantity,
                    entered_requested_quantity,
                    low_stock,
                    expiry_date,
                    comment,
                    confirmed,
                    // From the original row
                    rnr_form_id,
                    item_link_id,
                    requisition_line_id: requisition_id,
                    snapshot_quantity_received,
                    snapshot_quantity_consumed,
                    snapshot_adjustments,
                    previous_monthly_consumption_values,
                }
            },
        )
        .collect();

    (updated_rnr_form, update_lines)
}

impl From<RepositoryError> for UpdateRnRFormError {
    fn from(error: RepositoryError) -> Self {
        UpdateRnRFormError::DatabaseError(error)
    }
}
