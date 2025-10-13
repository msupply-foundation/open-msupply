use chrono::Utc;
use repository::{
    ActivityLogType, NumberRowType, RepositoryError, Requisition, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, RequisitionStatus,
    RequisitionType,
};
use util::uuid::uuid;

use crate::{
    activity_log::activity_log_entry,
    backend_plugin::plugin_provider::PluginError,
    number::next_number,
    requisition::{
        common::check_requisition_row_exists, query::get_requisition,
        requisition_supply_status::get_requisitions_supply_statuses,
    },
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};

#[derive(Debug, PartialEq)]
pub enum InsertFromResponseRequisitionError {
    RequisitionAlreadyExists,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    OtherPartyIsNotAStore,
    // Internal
    NewlyCreatedRequisitionDoesNotExist,
    PluginError(PluginError),
    DatabaseError(RepositoryError),
}

type OutError = InsertFromResponseRequisitionError;

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertFromResponseRequisition {
    pub id: String,
    pub response_requisition_ids: Vec<String>,
    pub other_party_id: String,
    pub comment: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
}

pub fn insert_from_response_requisition(
    ctx: &ServiceContext,
    input: InsertFromResponseRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            validate(ctx, &input)?;

            let GenerateResult {
                requisition,
                requisition_lines,
            } = generate(ctx, &input)?;

            RequisitionRowRepository::new(connection).upsert_one(&requisition)?;

            let requisition_line_repo = RequisitionLineRowRepository::new(connection);
            for requisition_line in requisition_lines {
                requisition_line_repo.upsert_one(&requisition_line)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::RequisitionCreated,
                Some(requisition.id.to_string()),
                None,
                None,
            )?;

            get_requisition(ctx, None, &requisition.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionDoesNotExist)
        })
        .map_err(|err| err.to_inner_error())?;

    Ok(requisition)
}

pub fn validate(
    ctx: &ServiceContext,
    input: &InsertFromResponseRequisition,
) -> Result<(), OutError> {
    let connection = &ctx.connection;

    if (check_requisition_row_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionAlreadyExists);
    }

    let other_party = check_other_party(
        connection,
        &ctx.store_id,
        &input.other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OutError::OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OutError::OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    other_party
        .store_id()
        .ok_or(OutError::OtherPartyIsNotAStore)?;

    Ok(())
}

struct GenerateResult {
    pub(crate) requisition: RequisitionRow,
    pub(crate) requisition_lines: Vec<RequisitionLineRow>,
}

fn generate(
    ctx: &ServiceContext,
    InsertFromResponseRequisition {
        id,
        response_requisition_ids,
        other_party_id,
        comment,
        max_months_of_stock,
        min_months_of_stock,
    }: &InsertFromResponseRequisition,
) -> Result<GenerateResult, InsertFromResponseRequisitionError> {
    let connection = &ctx.connection;

    let mut requisition = RequisitionRow {
        id: id.clone(),
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_link_id: other_party_id.clone(),
        store_id: ctx.store_id.clone(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: Utc::now().naive_utc(),
        comment: comment.clone(),
        max_months_of_stock: *max_months_of_stock,
        min_months_of_stock: *min_months_of_stock,
        // Defaults
        colour: None,
        expected_delivery_date: None,
        their_reference: None,
        program_id: None,
        period_id: None,
        order_type: None,
        is_emergency: false,
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
        destination_customer_id: None,
        created_from_requisition_ids: None, // Will be set below
    };

    requisition.set_created_from_requisition_ids(response_requisition_ids.clone());

    let requisition_supply =
        get_requisitions_supply_statuses(connection, response_requisition_ids.to_vec())?
            .into_iter()
            .filter(|s| s.remaining_quantity() > 0.0)
            .collect::<Vec<_>>();

    let requisition_lines = requisition_supply
        .iter()
        .map(|r| {
            let line = r.requisition_line.requisition_line_row.clone();

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition.id.clone(),
                item_link_id: line.item_link_id.clone(),
                requested_quantity: r.remaining_quantity(),
                snapshot_datetime: line.snapshot_datetime,
                comment: line.comment.clone(),
                item_name: line.item_name.clone(),
                // Defaults
                suggested_quantity: 0.0,
                available_stock_on_hand: 0.0,
                average_monthly_consumption: 0.0,
                initial_stock_on_hand_units: 0.0,
                incoming_units: 0.0,
                outgoing_units: 0.0,
                loss_in_units: 0.0,
                addition_in_units: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
                supply_quantity: 0.0,
                expiring_units: 0.0,
                days_out_of_stock: 0.0,
                option_id: None,
            }
        })
        .collect::<Vec<_>>();

    Ok(GenerateResult {
        requisition,
        requisition_lines,
    })
}

impl From<RepositoryError> for InsertFromResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertFromResponseRequisitionError::DatabaseError(error)
    }
}
