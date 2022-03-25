use chrono::{NaiveDate, NaiveDateTime};
use repository::{RepositoryError, RequisitionLine, StorageConnection};
mod historic_consumption;
pub use historic_consumption::*;

use crate::service_provider::ServiceContext;

use super::common::check_requisition_line_exists;

#[derive(Debug, PartialEq)]
pub enum RequisitionLineChartError {
    RequisitionLineDoesNotExist,
    RequisitionLineDoesNotBelongToCurrentStore,
    RequisitionLineIsLegacyRecord,
    // TODO not a reqest requisition
    // Internal
    DatabaseError(RepositoryError),
}
type OutError = RequisitionLineChartError;

#[derive(Debug, PartialEq)]
pub struct RequisitionLineChart {
    pub consumption_history: Vec<ConsumptionHistory>,
}

pub fn get_requisition_line_chart(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_line_id: &str,
    consumption_history_options: ConsumptionHistoryOptions,
) -> Result<RequisitionLineChart, OutError> {
    // Validate
    let ValidateResult {
        requisition_line,
        requisition_line_datetime,
        expected_delivery_date,
    } = validate(&ctx.connection, store_id, requisition_line_id)?;

    let mut consumption_history = get_historic_consumption_for_item(
        &ctx.connection,
        store_id,
        &requisition_line.requisition_line_row.item_id,
        requisition_line_datetime.date(),
        consumption_history_options,
    )?;

    // Replace last consumption_history element with requisition line AMC (current AMC)
    let requsition_line_row = &requisition_line.requisition_line_row;
    if let Some(last) = consumption_history.last_mut() {
        last.consumption = requsition_line_row.average_monthly_consumption as u32;
        last.average_monthly_consumption = requsition_line_row.average_monthly_consumption as f64;
    }

    Ok(RequisitionLineChart {
        consumption_history,
    })
}

struct ValidateResult {
    requisition_line: RequisitionLine,
    requisition_line_datetime: NaiveDateTime,
    expected_delivery_date: NaiveDate,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    requisition_line_id: &str,
) -> Result<ValidateResult, OutError> {
    let requisition_line = check_requisition_line_exists(connection, requisition_line_id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;

    if requisition_line.requisition_row.store_id != store_id {
        return Err(OutError::RequisitionLineDoesNotBelongToCurrentStore);
    }

    let requisition_line_datetime = requisition_line
        .requisition_line_row
        .snapshot_datetime
        .clone()
        .ok_or(OutError::RequisitionLineIsLegacyRecord)?;

    let expected_delivery_date = requisition_line
        .requisition_row
        .expected_delivery_date
        .clone()
        .ok_or(OutError::RequisitionLineIsLegacyRecord)?;

    Ok(ValidateResult {
        requisition_line,
        requisition_line_datetime,
        expected_delivery_date,
    })
}

impl From<RepositoryError> for OutError {
    fn from(error: RepositoryError) -> Self {
        OutError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{
            mock_item_a, mock_name_a, mock_request_draft_requisition_calculation_test, MockData,
            MockDataInserts,
        },
        schema::{
            InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowType, NameRow,
            RequisitionLineRow, RequisitionRow, RequisitionRowType, StockLineRow, StoreRow,
        },
        test_db::{setup_all, setup_all_with_data},
    };
    use util::{
        constants::NUMBER_OF_DAYS_IN_A_MONTH, date_now, inline_edit, inline_init, uuid::uuid,
    };

    type ServiceError = RequisitionLineChartError;

    #[actix_rt::test]
    async fn get_requisition_line_chart_errors() {
        let (_, _, connection_manager, _) =
            setup_all("get_requisition_line_chart_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.get_requisition_line_chart(
                &context,
                "store_a",
                "n/a",
                ConsumptionHistoryOptions::default()
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();

        // RequisitionLineDoesNotBelongToCurrentStore
        assert_eq!(
            service.get_requisition_line_chart(
                &context,
                "store_b",
                &test_line.id,
                ConsumptionHistoryOptions::default()
            ),
            Err(ServiceError::RequisitionLineDoesNotBelongToCurrentStore)
        );

        // RequisitionLineIsLegacyRecord
        assert_eq!(
            service.get_requisition_line_chart(
                &context,
                "store_a",
                &test_line.id,
                ConsumptionHistoryOptions::default()
            ),
            Err(ServiceError::RequisitionLineIsLegacyRecord)
        );
    }

    #[actix_rt::test]
    async fn get_requisition_line_chart_consumption() {
        fn name() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "name".to_string();
            })
        }

        fn store() -> StoreRow {
            StoreRow {
                id: "store".to_string(),
                name_id: name().id,
                code: "n/a".to_string(),
            }
        }

        fn requisition() -> RequisitionRow {
            inline_init(|r: &mut RequisitionRow| {
                r.id = "requisition".to_string();
                r.store_id = store().id;
                r.name_id = mock_name_a().id;
                r.expected_delivery_date = Some(date_now());
                r.r#type = RequisitionRowType::Request;
            })
        }

        fn requisition_line() -> RequisitionLineRow {
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = "requisition_line".to_string();
                r.requisition_id = requisition().id;
                r.item_id = mock_item_a().id;
                r.snapshot_datetime = Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0));
                r.average_monthly_consumption = 333;
            })
        }

        fn consumption_point() -> MockData {
            let invoice_id = uuid();
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_init(|r: &mut InvoiceRow| {
                    r.id = invoice_id.clone();
                    r.store_id = store().id;
                    r.name_id = mock_name_a().id;
                    r.r#type = InvoiceRowType::OutboundShipment;
                })];
                r.invoice_lines = vec![inline_init(|r: &mut InvoiceLineRow| {
                    r.id = format!("{}line", invoice_id);
                    r.invoice_id = invoice_id.clone();
                    r.item_id = mock_item_a().id;
                    r.r#type = InvoiceLineRowType::StockOut;
                    r.stock_line_id = Some(format!("{}stock_line", invoice_id));
                    r.pack_size = 1;
                })];
                r.stock_lines = vec![inline_init(|r: &mut StockLineRow| {
                    r.id = format!("{}stock_line", invoice_id);
                    r.store_id = store().id;
                    r.item_id = mock_item_a().id;
                    r.pack_size = 1;
                })];
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_requisition_line_chart_consumption",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![name()];
                r.stores = vec![store()];
                r.requisitions = vec![requisition()];
                r.requisition_lines = vec![requisition_line()];
            })
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 20;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 12, 4).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 10;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 11, 30).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 30;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 10, 10).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 40;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 10, 11).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 5;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 09, 25).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 5;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 09, 10).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 20;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 08, 07).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 15;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 07, 03).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 40;
                u
            }))
            .join(inline_edit(&consumption_point(), |mut u| {
                u.invoices[0].picked_datetime =
                    Some(NaiveDate::from_ymd(2020, 06, 20).and_hms(0, 0, 0));
                u.invoice_lines[0].number_of_packs = 30;
                u
            })),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        let result = service
            .get_requisition_line_chart(
                &context,
                &store().id,
                &requisition_line().id,
                ConsumptionHistoryOptions {
                    amc_look_back_months: 5,
                    number_of_data_points: 3,
                },
            )
            .unwrap();

        assert_eq!(
            result,
            RequisitionLineChart {
                consumption_history: vec![
                    ConsumptionHistory {
                        // 2020-11-01 to 2020-11-30
                        consumption: 30,
                        // 2020-07-01 to 2020-11-30
                        average_monthly_consumption: (30 + 40 + 5 + 5 + 20 + 15 + 40) as f64
                            / (NaiveDate::from_ymd(2020, 11, 30)
                                - NaiveDate::from_ymd(2020, 07, 01))
                            .num_days() as f64
                            * NUMBER_OF_DAYS_IN_A_MONTH,
                        date: NaiveDate::from_ymd(2020, 11, 30)
                    },
                    ConsumptionHistory {
                        // 2020-12-01 to 2020-12-31
                        consumption: 10,
                        // 2020-08-01 to 2020-12-31
                        average_monthly_consumption: (10 + 30 + 40 + 5 + 5 + 20 + 15) as f64
                            / (NaiveDate::from_ymd(2020, 12, 31)
                                - NaiveDate::from_ymd(2020, 08, 01))
                            .num_days() as f64
                            * NUMBER_OF_DAYS_IN_A_MONTH,
                        date: NaiveDate::from_ymd(2020, 12, 31)
                    },
                    ConsumptionHistory {
                        // This is populated by requisition line amc
                        consumption: 333,
                        average_monthly_consumption: 333.0,
                        date: NaiveDate::from_ymd(2021, 01, 31)
                    },
                ]
            }
        );
    }
}
