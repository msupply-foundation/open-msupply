use crate::{
    requisition::request_requisition::{suggested_quantity, ForecastMethodUnavailableReason},
    requisition_line::request_requisition_line::{
        DeleteRequestRequisitionLine, InsertRequestRequisitionLine, UpdateRequestRequisitionLine,
        UpdateRequestRequisitionLineError,
    },
    service_provider::{ServiceContext, ServiceProvider},
};
use repository::{
    ancillary_item_row::{AncillaryItemRow, AncillaryItemRowRepository},
    mock::{
        mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_request_draft_requisition,
        mock_store_a, MockData, MockDataInserts,
    },
    test_db::setup_all_with_data,
    ForecastData, ForecastMethod, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    StorageConnection,
};

fn requisition() -> RequisitionRow {
    RequisitionRow {
        id: "forecast_requisition".to_string(),
        requisition_number: 999,
        max_months_of_stock: 3.0,
        min_months_of_stock: 0.0,
        ..mock_request_draft_requisition()
    }
}

/// `item_quantity` principal units to `ancillary_quantity` ancillary units
fn link(
    principal: &str,
    ancillary: &str,
    item_quantity: f64,
    ancillary_quantity: f64,
) -> AncillaryItemRow {
    AncillaryItemRow {
        id: format!("{principal}_{ancillary}"),
        item_id: principal.to_string(),
        ancillary_item_id: ancillary.to_string(),
        item_quantity,
        ancillary_quantity,
        deleted_datetime: None,
    }
}

struct Setup {
    connection: StorageConnection,
    service_provider: ServiceProvider,
}

impl Setup {
    async fn new(name: &str, links: Vec<AncillaryItemRow>) -> Setup {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            name,
            MockDataInserts::all(),
            MockData {
                requisitions: vec![requisition()],
                ..Default::default()
            },
        )
        .await;
        let repository = AncillaryItemRowRepository::new(&connection);
        for link in links {
            repository.upsert_one(&link).unwrap();
        }
        Setup {
            connection,
            service_provider: ServiceProvider::new(connection_manager),
        }
    }

    fn context(&self) -> ServiceContext {
        self.service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap()
    }

    fn add(&self, item_id: &str) -> RequisitionLineRow {
        let line_id = format!("line_{item_id}");
        self.service_provider
            .requisition_line_service
            .insert_request_requisition_line(
                &self.context(),
                InsertRequestRequisitionLine {
                    id: line_id.clone(),
                    item_id: item_id.to_string(),
                    requisition_id: requisition().id,
                },
            )
            .unwrap();
        self.line(item_id)
    }

    fn line(&self, item_id: &str) -> RequisitionLineRow {
        RequisitionLineRowRepository::new(&self.connection)
            .find_one_by_id(&format!("line_{item_id}"))
            .unwrap()
            .unwrap()
    }

    /// Sets a line's stored AMC and monthly demand, as if its item had that consumption
    fn set_demand(&self, item_id: &str, amc: f64) {
        let mut line = self.line(item_id);
        line.average_monthly_consumption = amc;
        line.forecast_monthly_consumption = amc;
        RequisitionLineRowRepository::new(&self.connection)
            .upsert_one(&line)
            .unwrap();
    }

    fn change_method(
        &self,
        item_id: &str,
        method: ForecastMethod,
    ) -> Result<(), UpdateRequestRequisitionLineError> {
        self.service_provider
            .requisition_line_service
            .update_request_requisition_line(
                &self.context(),
                UpdateRequestRequisitionLine {
                    id: format!("line_{item_id}"),
                    forecast_method: Some(method),
                    ..Default::default()
                },
            )
            .map(|_| ())
    }

    fn delete(&self, item_id: &str) {
        self.service_provider
            .requisition_line_service
            .delete_request_requisition_line(
                &self.context(),
                DeleteRequestRequisitionLine {
                    id: format!("line_{item_id}"),
                },
            )
            .unwrap();
    }
}

fn principal_items(line: &RequisitionLineRow) -> Vec<String> {
    match line
        .forecast_data
        .as_deref()
        .and_then(ForecastData::from_json)
    {
        Some(ForecastData::AncillaryRatio(forecast)) => forecast
            .principals
            .into_iter()
            .map(|principal| principal.item_id)
            .collect(),
        _ => vec![],
    }
}

#[actix_rt::test]
async fn forecast_defaults_and_ancillary_chain() {
    let (a, b, c) = (mock_item_a().id, mock_item_b().id, mock_item_c().id);
    // a → b at 100 : 10 (1 b per 10 a); b → c at 1 : 2
    let setup = Setup::new(
        "forecast_defaults_and_ancillary_chain",
        vec![link(&a, &b, 100.0, 10.0), link(&b, &c, 1.0, 2.0)],
    )
    .await;

    // Nothing feeds a, and the population preference is off: AMC
    let line_a = setup.add(&a);
    assert_eq!(line_a.forecast_method, ForecastMethod::Amc);
    assert_eq!(
        line_a.forecast_monthly_consumption,
        line_a.average_monthly_consumption
    );
    assert_eq!(line_a.forecast_data, None);
    setup.set_demand(&a, 50.0);

    // b's principal is on the order: Ancillary ratio, from a's demand
    let line_b = setup.add(&b);
    assert_eq!(line_b.forecast_method, ForecastMethod::AncillaryRatio);
    assert_eq!(line_b.forecast_monthly_consumption, 5.0);
    assert_eq!(principal_items(&line_b), vec![a.clone()]);
    // The one suggestion formula, over the line's monthly demand
    assert_eq!(
        line_b.suggested_quantity,
        suggested_quantity(&requisition(), 5.0, line_b.available_stock_on_hand)
    );

    // A chain resolves from the top: c follows b's computed demand
    let line_c = setup.add(&c);
    assert_eq!(line_c.forecast_method, ForecastMethod::AncillaryRatio);
    assert_eq!(line_c.forecast_monthly_consumption, 10.0);

    // An unavailable method is rejected
    assert_eq!(
        setup.change_method(&a, ForecastMethod::AncillaryRatio),
        Err(
            UpdateRequestRequisitionLineError::ForecastMethodNotAvailable(
                ForecastMethodUnavailableReason::NoPrincipalOnOrder
            )
        )
    );
    assert_eq!(
        setup.change_method(&a, ForecastMethod::Population),
        Err(
            UpdateRequestRequisitionLineError::ForecastMethodNotAvailable(
                ForecastMethodUnavailableReason::PopulationPreferenceOff
            )
        )
    );

    // A method change recomputes the line and cascades down the chain, leaving the
    // requested quantity alone
    setup.set_demand(&b, 7.0);
    let requested_before = setup.line(&b).requested_quantity;
    setup.change_method(&b, ForecastMethod::Amc).unwrap();
    let line_b = setup.line(&b);
    assert_eq!(line_b.forecast_method, ForecastMethod::Amc);
    assert_eq!(line_b.forecast_monthly_consumption, 7.0);
    assert_eq!(
        line_b.suggested_quantity,
        suggested_quantity(&requisition(), 7.0, line_b.available_stock_on_hand)
    );
    assert_eq!(line_b.requested_quantity, requested_before);
    assert_eq!(setup.line(&c).forecast_monthly_consumption, 14.0);

    // And back: b follows a again, c follows b
    setup
        .change_method(&b, ForecastMethod::AncillaryRatio)
        .unwrap();
    assert_eq!(setup.line(&b).forecast_monthly_consumption, 5.0);
    assert_eq!(setup.line(&c).forecast_monthly_consumption, 10.0);

    // The last principal leaves: b takes its next default (AMC), and c follows
    setup.delete(&a);
    let line_b = setup.line(&b);
    assert_eq!(line_b.forecast_method, ForecastMethod::Amc);
    assert_eq!(line_b.forecast_monthly_consumption, 7.0);
    assert_eq!(setup.line(&c).forecast_monthly_consumption, 14.0);
}

#[actix_rt::test]
async fn forecast_principal_arrives() {
    let (a, b, d) = (mock_item_a().id, mock_item_b().id, mock_item_d().id);
    // Both a and d feed b
    let setup = Setup::new(
        "forecast_principal_arrives",
        vec![link(&a, &b, 1.0, 1.0), link(&d, &b, 1.0, 1.0)],
    )
    .await;

    // b is added first: nothing feeds it, so AMC
    setup.add(&b);
    assert_eq!(setup.line(&b).forecast_method, ForecastMethod::Amc);

    // Adding a principal never switches an existing line to Ancillary ratio
    setup.add(&a);
    setup.set_demand(&a, 4.0);
    assert_eq!(setup.line(&b).forecast_method, ForecastMethod::Amc);

    // but it becomes selectable
    setup
        .change_method(&b, ForecastMethod::AncillaryRatio)
        .unwrap();
    assert_eq!(setup.line(&b).forecast_monthly_consumption, 4.0);

    // An existing Ancillary-ratio line recomputes to include a principal added after it
    setup.add(&d);
    let line_b = setup.line(&b);
    assert_eq!(
        line_b.forecast_monthly_consumption,
        4.0 + setup.line(&d).forecast_monthly_consumption
    );
    let mut principals = principal_items(&line_b);
    principals.sort();
    let mut expected = vec![a, d];
    expected.sort();
    assert_eq!(principals, expected);
}
