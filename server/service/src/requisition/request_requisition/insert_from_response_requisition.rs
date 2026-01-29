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
    pricing::item_price::{get_pricing_for_items, ItemPriceLookup},
    requisition::{
        common::{check_requisition_row_exists, get_indicative_price_pref},
        query::get_requisition,
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
    pub response_requisition_id: String,
    pub other_party_id: String,
    pub comment: Option<String>,
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
        response_requisition_id,
        other_party_id,
        comment,
    }: &InsertFromResponseRequisition,
) -> Result<GenerateResult, InsertFromResponseRequisitionError> {
    let connection = &ctx.connection;
    let response_requisition = RequisitionRowRepository::new(connection)
        .find_one_by_id(response_requisition_id)?
        .ok_or(InsertFromResponseRequisitionError::DatabaseError(
            RepositoryError::NotFound,
        ))?;

    let requisition = RequisitionRow {
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
        max_months_of_stock: response_requisition.max_months_of_stock,
        min_months_of_stock: response_requisition.min_months_of_stock,
        created_from_requisition_id: Some(response_requisition_id.clone()),
        program_id: response_requisition.program_id.clone(),
        period_id: response_requisition.period_id.clone(),
        order_type: response_requisition.order_type.clone(),
        is_emergency: response_requisition.is_emergency,
        // Defaults
        colour: None,
        expected_delivery_date: None,
        their_reference: None,
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
        original_customer_id: None,
    };

    // Response requisition that still need to be supplied (supply < requested)
    let requisition_supply =
        get_requisitions_supply_statuses(connection, vec![response_requisition_id.clone()])?
            .into_iter()
            .filter(|s| s.requested_minus_supply_quantity() > 0.0)
            .collect::<Vec<_>>();

    let populate_price_per_unit = get_indicative_price_pref(&ctx.connection)?;
    let price_list = if populate_price_per_unit {
        Some(get_pricing_for_items(
            &ctx.connection,
            ItemPriceLookup {
                item_ids: requisition_supply
                    .iter()
                    .map(|r| r.item_id().to_string())
                    .collect(),
                customer_name_id: None,
            },
        )?)
    } else {
        None
    };

    let requisition_lines = requisition_supply
        .iter()
        .map(|r| {
            let line = r.requisition_line.requisition_line_row.clone();

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition.id.clone(),
                item_link_id: line.item_link_id.clone(),
                requested_quantity: r.requested_minus_supply_quantity().abs(),
                snapshot_datetime: line.snapshot_datetime,
                comment: line.comment.clone(),
                item_name: line.item_name.clone(),
                // Stats from original Internal Order
                suggested_quantity: line.suggested_quantity,
                available_stock_on_hand: line.available_stock_on_hand,
                average_monthly_consumption: line.average_monthly_consumption,
                price_per_unit: if let Some(price_list) = &price_list {
                    price_list
                        .get(&r.requisition_line.item_row.id)
                        .cloned()
                        .unwrap_or_default()
                        .calculated_price_per_unit
                } else {
                    None
                },
                // Defaults
                available_volume: None,
                location_type_id: None,
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

#[cfg(test)]
mod test_insert_from_response_requisition {
    use crate::{
        requisition::request_requisition::InsertFromResponseRequisition,
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_full_new_response_requisition_for_update_test, mock_name_store_c, mock_store_a,
            MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, RequisitionLineFilter, RequisitionLineRepository, RequisitionRowRepository,
    };
    use util::uuid::uuid;

    #[actix_rt::test]
    async fn insert_from_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_from_response_requisition_success",
            MockDataInserts::all(),
            MockData::default(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let response_requisition = mock_full_new_response_requisition_for_update_test();
        let new_requisition_id = uuid();

        let result = service
            .insert_from_response_requisition(
                &context,
                InsertFromResponseRequisition {
                    id: new_requisition_id.clone(),
                    response_requisition_id: response_requisition.requisition.id.clone(),
                    other_party_id: mock_name_store_c().id,
                    comment: Some("Test comment".to_string()),
                },
            )
            .unwrap();

        let requisition = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&new_requisition_id)
            .unwrap()
            .unwrap();

        assert_eq!(requisition, result.requisition_row.clone());

        // Verify requisition lines were created from response requisition
        let lines = RequisitionLineRepository::new(&connection)
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(new_requisition_id.to_string())),
            )
            .unwrap();

        for line in &lines {
            assert_eq!(line.requisition_row.id, new_requisition_id);
        }
    }
}
