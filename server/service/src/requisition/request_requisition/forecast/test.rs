use crate::{
    requisition::request_requisition::{ForecastMethodUnavailableReason, suggested_quantity},
    requisition_line::request_requisition_line::{
        DeleteRequestRequisitionLine, InsertRequestRequisitionLine, RequisitionLineForecastPreview,
        RequisitionLineForecastPreviewError, RequisitionLineForecastPreviewInput,
        UpdateRequestRequisitionLine, UpdateRequestRequisitionLineError,
    },
    service_provider::{ServiceContext, ServiceProvider},
};
use repository::{
    ForecastData, ForecastMethod, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    StorageConnection,
    ancillary_item_row::{AncillaryItemRow, AncillaryItemRowRepository},
    mock::{
        MockData, MockDataInserts, mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_item_e,
        mock_item_f, mock_item_g, mock_request_draft_requisition, mock_store_a,
        mock_vaccine_item_a,
    },
    test_db::setup_all_with_data,
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
        exclude_principal_wastage: false,
        wastage_rate: 0.0,
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

    fn preview(
        &self,
        item_id: &str,
        method: Option<ForecastMethod>,
    ) -> Result<RequisitionLineForecastPreview, RequisitionLineForecastPreviewError> {
        self.service_provider
            .requisition_line_service
            .get_requisition_line_forecast_preview(
                &self.context(),
                RequisitionLineForecastPreviewInput {
                    requisition_id: requisition().id,
                    item_id: item_id.to_string(),
                    forecast_method: method,
                    ..Default::default()
                },
            )
    }

    fn find_line(&self, item_id: &str) -> Option<RequisitionLineRow> {
        RequisitionLineRowRepository::new(&self.connection)
            .find_one_by_id(&format!("line_{item_id}"))
            .unwrap()
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
async fn forecast_ancillary_excludes_principal_wastage() {
    let (vaccine, b, c) = (mock_vaccine_item_a().id, mock_item_b().id, mock_item_c().id);
    // store_a overrides the vaccine's course with a 50% wastage rate. b (syringes) isn't
    // wasted along with the vaccine, so its link excludes the wastage; c (safety boxes)
    // follows every vial.
    let mut syringe = link(&vaccine, &b, 1.0, 1.0);
    syringe.exclude_principal_wastage = true;
    let setup = Setup::new(
        "forecast_ancillary_excludes_principal_wastage",
        vec![syringe, link(&vaccine, &c, 1.0, 1.0)],
    )
    .await;

    setup.add(&vaccine);
    setup.set_demand(&vaccine, 100.0);

    // b follows the 50 doses given, and records what it deducted
    let line_b = setup.add(&b);
    assert_eq!(line_b.forecast_method, ForecastMethod::AncillaryRatio);
    assert_eq!(line_b.forecast_monthly_consumption, 50.0);
    let Some(ForecastData::AncillaryRatio(forecast)) = line_b
        .forecast_data
        .as_deref()
        .and_then(ForecastData::from_json)
    else {
        panic!("expected an Ancillary ratio breakdown");
    };
    assert_eq!(forecast.principals[0].wastage_rate, 50.0);
    assert_eq!(forecast.principals[0].principal_usable_consumption(), 50.0);

    // c follows the whole demand
    let line_c = setup.add(&c);
    assert_eq!(line_c.forecast_monthly_consumption, 100.0);
    let Some(ForecastData::AncillaryRatio(forecast)) = line_c
        .forecast_data
        .as_deref()
        .and_then(ForecastData::from_json)
    else {
        panic!("expected an Ancillary ratio breakdown");
    };
    assert_eq!(forecast.principals[0].wastage_rate, 0.0);
}

#[actix_rt::test]
async fn forecast_ancillary_adds_the_supply_wastage() {
    let (vaccine, b, c, d) = (
        mock_vaccine_item_a().id,
        mock_item_b().id,
        mock_item_c().id,
        mock_item_d().id,
    );
    // store_a gives the vaccine a 50% wastage rate. b (syringes) is used for the doses given
    // and 20% of them break. c (safety boxes) follows the syringes, broken ones included.
    // d excludes the syringes' wastage, which as no course covers them is their own 20%.
    let mut syringe = link(&vaccine, &b, 1.0, 1.0);
    syringe.exclude_principal_wastage = true;
    syringe.wastage_rate = 20.0;
    let mut lid = link(&b, &d, 1.0, 1.0);
    lid.exclude_principal_wastage = true;
    let setup = Setup::new(
        "forecast_ancillary_adds_the_supply_wastage",
        vec![syringe, link(&b, &c, 100.0, 1.0), lid],
    )
    .await;

    setup.add(&vaccine);
    setup.set_demand(&vaccine, 100.0);

    // 50 doses given ÷ (1 − 20%) = 62.5 syringes
    let line_b = setup.add(&b);
    assert_eq!(line_b.forecast_monthly_consumption, 62.5);
    let Some(ForecastData::AncillaryRatio(forecast)) = line_b
        .forecast_data
        .as_deref()
        .and_then(ForecastData::from_json)
    else {
        panic!("expected an Ancillary ratio breakdown");
    };
    assert_eq!(forecast.principals[0].wastage_rate, 50.0);
    assert_eq!(forecast.principals[0].own_wastage_rate, 20.0);

    // 62.5 syringes ÷ 100 = 0.625 safety boxes
    assert_eq!(setup.add(&c).forecast_monthly_consumption, 0.625);
    // 62.5 syringes less their own 20% = 50
    assert_eq!(setup.add(&d).forecast_monthly_consumption, 50.0);
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

#[actix_rt::test]
async fn forecast_ancillary_cycle() {
    let (a, b) = (mock_item_a().id, mock_item_b().id);
    // a → b and b → a, each at 1 : 2. Upsert rejects a cycle, but links arriving by sync
    // aren't checked
    let setup = Setup::new(
        "forecast_ancillary_cycle",
        vec![link(&a, &b, 1.0, 2.0), link(&b, &a, 1.0, 2.0)],
    )
    .await;

    setup.add(&a);
    setup.set_demand(&a, 10.0);
    assert_eq!(setup.add(&b).forecast_monthly_consumption, 20.0);

    // a follows b, and b follows a once more; the walk stops where it meets a again,
    // rather than feeding the cycle until a round limit
    setup
        .change_method(&a, ForecastMethod::AncillaryRatio)
        .unwrap();
    assert_eq!(setup.line(&a).forecast_monthly_consumption, 40.0);
    assert_eq!(setup.line(&b).forecast_monthly_consumption, 80.0);
}

#[actix_rt::test]
async fn forecast_ancillary_max_depth() {
    let items: Vec<String> = vec![
        mock_item_a(),
        mock_item_b(),
        mock_item_c(),
        mock_item_d(),
        mock_item_e(),
        mock_item_f(),
        mock_item_g(),
    ]
    .into_iter()
    .map(|item| item.id)
    .collect();
    // a → b → c → d → e → f → g, each at 1 : 1: six links, one more than the ancillary
    // refresh follows
    let links = items
        .windows(2)
        .map(|pair| link(&pair[0], &pair[1], 1.0, 1.0))
        .collect();
    let setup = Setup::new("forecast_ancillary_max_depth", links).await;

    setup.add(&items[0]);
    setup.set_demand(&items[0], 1000.0);
    for item_id in &items[1..] {
        let line = setup.add(item_id);
        assert_eq!(line.forecast_method, ForecastMethod::AncillaryRatio);
        assert_eq!(line.forecast_monthly_consumption, 1000.0);
    }

    // a leaves: b takes its default and the change walks five links down, to f; g, six
    // links from a, is left as it was
    setup.delete(&items[0]);
    let b_demand = setup.line(&items[1]).forecast_monthly_consumption;
    assert_ne!(b_demand, 1000.0);
    for item_id in &items[2..6] {
        assert_eq!(setup.line(item_id).forecast_monthly_consumption, b_demand);
    }
    assert_eq!(setup.line(&items[6]).forecast_monthly_consumption, 1000.0);
}

/// The forecast fields a preview and a save must agree on
fn forecast_of(line: &RequisitionLineRow) -> (ForecastMethod, f64, Option<String>, f64) {
    (
        line.forecast_method.clone(),
        line.forecast_monthly_consumption,
        line.forecast_data.clone(),
        line.suggested_quantity,
    )
}

#[actix_rt::test]
async fn forecast_preview_matches_save() {
    let (a, b) = (mock_item_a().id, mock_item_b().id);
    // a → b at 100 : 10
    let setup = Setup::new(
        "forecast_preview_matches_save",
        vec![link(&a, &b, 100.0, 10.0)],
    )
    .await;
    setup.add(&a);
    setup.set_demand(&a, 50.0);

    // A new item previews the line its insert would create, and creates nothing
    let preview = setup.preview(&b, None).unwrap();
    assert_eq!(preview.line.forecast_method, ForecastMethod::AncillaryRatio);
    assert_eq!(preview.line.forecast_monthly_consumption, 5.0);
    assert_eq!(
        preview.max_months_of_stock,
        requisition().max_months_of_stock
    );
    assert!(
        preview
            .forecast_method_options
            .iter()
            .all(|option| option.method == ForecastMethod::Population
                || option.unavailable_reason.is_none())
    );
    assert_eq!(setup.find_line(&b), None);

    // Another method on the new item, as a method change would apply it
    let amc_preview = setup.preview(&b, Some(ForecastMethod::Amc)).unwrap();
    assert_eq!(amc_preview.line.forecast_method, ForecastMethod::Amc);
    assert_eq!(
        amc_preview.line.forecast_monthly_consumption,
        amc_preview.line.average_monthly_consumption
    );

    // Saving reproduces the default preview
    let line_b = setup.add(&b);
    assert_eq!(forecast_of(&line_b), forecast_of(&preview.line));

    // An existing line previews from its stored line, and is left as it was
    setup.set_demand(&b, 7.0);
    let before = setup.line(&b);
    let amc_preview = setup.preview(&b, Some(ForecastMethod::Amc)).unwrap();
    assert_eq!(setup.line(&b), before);
    setup.change_method(&b, ForecastMethod::Amc).unwrap();
    assert_eq!(forecast_of(&setup.line(&b)), forecast_of(&amc_preview.line));

    // An unavailable method is rejected, as for a method change
    assert_eq!(
        setup.preview(&a, Some(ForecastMethod::AncillaryRatio)),
        Err(
            RequisitionLineForecastPreviewError::ForecastMethodNotAvailable(
                ForecastMethodUnavailableReason::NoPrincipalOnOrder
            )
        )
    );
}
