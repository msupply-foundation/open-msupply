use chrono::Utc;
use repository::{
    ActivityLogType, EqualFilter, NumberRowType, RepositoryError, Requisition, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, RequisitionStatus,
    RequisitionType, StoreFilter, StoreRepository,
};

use crate::{
    PluginOrRepositoryError,
    activity_log::activity_log_entry,
    backend_plugin::plugin_provider::PluginError,
    number::next_number,
    requisition::{
        common::check_requisition_row_exists,
        query::get_requisition,
        request_requisition::{default_target_months_of_stock, generate_requisition_lines},
        requisition_supply_status::get_requisitions_supply_statuses,
    },
    service_provider::ServiceContext,
    validate::{CheckOtherPartyType, OtherPartyErrors, check_other_party},
};

#[derive(Debug, PartialEq, Clone)]
pub enum InsertFromResponseStatus {
    Draft,
    Sent,
}

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
    pub status: Option<InsertFromResponseStatus>,
}

pub fn insert_request_from_response_requisition(
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
        status,
    }: &InsertFromResponseRequisition,
) -> Result<GenerateResult, InsertFromResponseRequisitionError> {
    let connection = &ctx.connection;
    let response_requisition = RequisitionRowRepository::new(connection)
        .find_one_by_id(response_requisition_id)?
        .ok_or(InsertFromResponseRequisitionError::DatabaseError(
            RepositoryError::NotFound,
        ))?;

    let other_party_store = StoreRepository::new(connection)
        .query_one(StoreFilter::new().name_id(EqualFilter::equal_to(other_party_id.clone())))?;

    // The order restocks this store, so a general one takes this store's target, as any new
    // general order does: its supply interval + safety buffer (the target a store that fixes it
    // fixes it to), with no reorder threshold. A program order keeps its order type's thresholds.
    let (max_months_of_stock, min_months_of_stock) = match response_requisition.program_id {
        Some(_) => (
            response_requisition.max_months_of_stock,
            response_requisition.min_months_of_stock,
        ),
        None => (
            default_target_months_of_stock(connection, &ctx.store_id)?,
            0.0,
        ),
    };

    let requisition = RequisitionRow {
        id: id.clone(),
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_id: other_party_id.clone(),
        name_store_id: other_party_store.map(|store| store.store_row.id),
        store_id: ctx.store_id.clone(),
        r#type: RequisitionType::Request,
        status: match status {
            Some(InsertFromResponseStatus::Draft) => RequisitionStatus::Draft,
            Some(InsertFromResponseStatus::Sent) => RequisitionStatus::Sent,
            None => RequisitionStatus::Draft,
        },
        created_datetime: Utc::now().naive_utc(),
        comment: comment.clone(),
        max_months_of_stock,
        min_months_of_stock,
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
        destination_customer_id: None,
        ..Default::default()
    };

    // Response requisition that still need to be supplied (supply < requested)
    let requisition_supply =
        get_requisitions_supply_statuses(connection, vec![response_requisition_id.clone()])?
            .into_iter()
            .filter(|s| s.requested_minus_supply_quantity() > 0.0)
            .collect::<Vec<_>>();
    let item_ids = requisition_supply
        .iter()
        .map(|r| r.item_id().to_string())
        .collect::<Vec<_>>();

    // Each line as this store generates any new line (from its own stock, AMC and forecast),
    // requesting what the customer is still short of
    let mut requisition_lines =
        generate_requisition_lines(ctx, &ctx.store_id, &requisition, item_ids, None)?;
    for line in &mut requisition_lines {
        if let Some(supply) = requisition_supply
            .iter()
            .find(|supply| supply.item_id() == line.item_id)
        {
            line.requested_quantity = supply.requested_minus_supply_quantity().abs();
            line.comment = supply.requisition_line.requisition_line_row.comment.clone();
        }
    }

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

impl From<PluginOrRepositoryError> for InsertFromResponseRequisitionError {
    fn from(error: PluginOrRepositoryError) -> Self {
        use InsertFromResponseRequisitionError as to;
        use PluginOrRepositoryError as from;
        match error {
            from::RepositoryError(repository_error) => repository_error.into(),
            from::PluginError(plugin_error) => to::PluginError(plugin_error),
        }
    }
}

#[cfg(test)]
mod test_insert_request_from_response_requisition {
    use crate::{
        requisition::request_requisition::{
            GenerateSuggestedQuantity, InsertFromResponseRequisition, generate_suggested_quantity,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        EqualFilter, NameRowRepository, PreferenceRow, PreferenceRowRepository,
        RequisitionLineFilter, RequisitionLineRepository, RequisitionRowRepository,
        mock::{
            MockData, MockDataInserts, mock_full_new_response_requisition_for_update_test,
            mock_name_store_a, mock_name_store_c, mock_store_a,
        },
        test_db::setup_all_with_data,
    };
    use util::uuid::uuid;

    #[actix_rt::test]
    async fn insert_request_from_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_request_from_response_requisition_success",
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
            .insert_request_from_response_requisition(
                &context,
                InsertFromResponseRequisition {
                    id: new_requisition_id.clone(),
                    response_requisition_id: response_requisition.requisition.id.clone(),
                    other_party_id: mock_name_store_c().id,
                    comment: Some("Test comment".to_string()),
                    status: None,
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

    #[actix_rt::test]
    async fn insert_request_from_response_requisition_follows_this_store() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_request_from_response_requisition_follows_this_store",
            MockDataInserts::all(),
            MockData::default(),
        )
        .await;
        // This store has a 2 + 1 month supply interval and safety buffer, and fixes the target
        NameRowRepository::new(&connection)
            .update_properties(
                &mock_name_store_a().id,
                &Some(r#"{"supply_interval": 2, "buffer_stock": 1}"#.to_string()),
            )
            .unwrap();
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "can_change_target_months_of_stock_store_a".to_string(),
                key: "can_change_target_months_of_stock".to_string(),
                value: "false".to_string(),
                store_id: Some(mock_store_a().id),
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let response_requisition = mock_full_new_response_requisition_for_update_test();
        let new_requisition_id = uuid();
        let result = service_provider
            .requisition_service
            .insert_request_from_response_requisition(
                &context,
                InsertFromResponseRequisition {
                    id: new_requisition_id.clone(),
                    response_requisition_id: response_requisition.requisition.id.clone(),
                    other_party_id: mock_name_store_c().id,
                    comment: None,
                    status: None,
                },
            )
            .unwrap();

        // The customer's 10 / 5 months aren't copied: this store's 2 + 1, no threshold
        assert_eq!(result.requisition_row.max_months_of_stock, 3.0);
        assert_eq!(result.requisition_row.min_months_of_stock, 0.0);

        let lines = RequisitionLineRepository::new(&connection)
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(new_requisition_id.to_string())),
            )
            .unwrap();
        assert!(!lines.is_empty());
        for line in lines {
            let line = line.requisition_line_row;
            let source = response_requisition
                .lines
                .iter()
                .find(|source| source.item_id == line.item_id)
                .unwrap();
            // Requests the customer's shortfall
            assert_eq!(
                line.requested_quantity,
                source.requested_quantity - source.supply_quantity
            );
            // Suggests from this store's own figures and forecast
            assert_eq!(
                line.suggested_quantity,
                generate_suggested_quantity(GenerateSuggestedQuantity {
                    forecast_monthly_consumption: line.forecast_monthly_consumption,
                    available_stock_on_hand: line.available_stock_on_hand,
                    min_months_of_stock: 0.0,
                    max_months_of_stock: 3.0,
                })
            );
        }
    }
}
