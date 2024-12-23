use std::collections::HashMap;

use crate::{
    ledger::get_item_ledger, service_provider::ServiceContext,
    store_preference::get_store_preferences, ListError,
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ledger::{LedgerFilter, LedgerSort, LedgerSortField},
    DatetimeFilter, EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceType, NameFilter,
    NameRepository, NameRow, Pagination, PeriodFilter, PeriodRepository, PeriodRowRepository,
    RepositoryError, Requisition, RequisitionFilter, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRepository, RequisitionType, StorageConnection,
    StoreFilter, StoreRepository,
};

// TODO: MOVE TO PLUGIN
#[derive(Debug, PartialEq, Clone)]
pub struct RequisitionItemInformation {
    pub id: String,        // Customer or current store name id
    pub amc_in_units: f64, // Area AMC for store
    pub stock_in_units: f64,
    pub adjustments_in_units: f64,
    pub date_range: Option<NaiveDateTime>, // Period end date for store and requisition creation date for customers
}

pub fn get_requisition_item_information(
    ctx: &ServiceContext,
    store_id: &str,
    program_id: &str,
    elmis_code: Option<String>,
    period_id: &str,
    item_id: &str,
) -> Result<Vec<RequisitionItemInformation>, RepositoryError> {
    let connection = &ctx.connection;
    let name_repo = NameRepository::new(connection);

    let store_preferences = get_store_preferences(connection, store_id)?;

    let customers = name_repo.query(
        store_id,
        Pagination::all(),
        Some(
            NameFilter::new()
                .supplying_store_id(EqualFilter::equal_to(store_id))
                .is_customer(true),
        ),
        None,
    )?;
    if customers.is_empty()
        || (!store_preferences.extra_fields_in_requisition
            && !store_preferences.use_consumption_and_stock_from_customers_for_internal_orders)
    {
        return Ok(vec![]);
    }

    let period = PeriodRowRepository::new(connection)
        .find_one_by_id(period_id)?
        .ok_or(RepositoryError::NotFound)?;

    let mut item_info: HashMap<String, RequisitionItemInformation> = HashMap::new();

    // Customer information
    let req_filter = RequisitionFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .period_id(EqualFilter::equal_to(period_id))
        .name_id(EqualFilter::equal_any(
            customers.iter().map(|c| c.name_row.id.clone()).collect(),
        ))
        .r#type(RequisitionType::Response.equal_to());

    let filter = if let Some(elmis_code) = elmis_code.clone() {
        req_filter.elmis_code(EqualFilter::equal_to(&elmis_code))
    } else {
        req_filter.program_id(EqualFilter::equal_to(program_id))
    };

    let requisitions = get_latest_requisitions(connection, filter)?;

    let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_any(
                requisitions
                    .iter()
                    .map(|r| r.requisition_row.id.clone())
                    .collect(),
            ))
            .item_id(EqualFilter::equal_to(item_id)),
    )?;

    for requisition_line in &requisition_lines {
        let line = requisition_line.requisition_line_row.clone();
        let customer_id = requisition_line.requisition_row.name_link_id.clone();
        item_info
            .entry(customer_id.clone())
            .or_insert_with(|| RequisitionItemInformation {
                id: customer_id.clone(),
                amc_in_units: line.average_monthly_consumption,
                stock_in_units: line.available_stock_on_hand
                    + (line.average_monthly_consumption / 30.0),
                adjustments_in_units: line.addition_in_units + line.incoming_units
                    - line.outgoing_units
                    - line.loss_in_units,
                date_range: Some(requisition_line.requisition_row.created_datetime),
            });
    }

    let customers_without_requisitions: Vec<NameRow> = customers
        .iter()
        .filter(|c| {
            !requisitions
                .iter()
                .any(|r| r.requisition_row.name_link_id == c.name_row.id)
        })
        .map(|c| c.name_row.clone())
        .collect();

    let mut periods_for_schedule = PeriodRepository::new(connection).query_by_filter(
        store_id.to_string(),
        program_id.to_string(),
        PeriodFilter::new().period_schedule_id(EqualFilter::equal_to(&period.period_schedule_id)),
    )?;
    let look_back_period = store_preferences.monthly_consumption_look_back_period;
    let look_back_date = period
        .end_date
        .checked_sub_signed(chrono::Duration::days(look_back_period as i64));
    periods_for_schedule.retain(|p| {
        p.period_row.end_date <= period.end_date
            && p.period_row.end_date >= look_back_date.unwrap_or(period.end_date)
    });
    periods_for_schedule.sort_by(|a, b| a.period_row.end_date.cmp(&b.period_row.end_date));

    for customer in customers_without_requisitions {
        // AMC: When a store has no AMC for an item line for a program and a
        // period, instead of using “0”, pull the previous month’s AMC (m-1), if
        // there is no AMC at m-1, pull the AMC at m-2, etc. until data > 0 is found or until m-6.
        let mut amc = 0.0;
        let mut date_range = None;

        for period in periods_for_schedule.iter().rev() {
            let req_filter = RequisitionFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .period_id(EqualFilter::equal_to(&period.period_row.id))
                .name_id(EqualFilter::equal_to(&customer.id))
                .r#type(RequisitionType::Response.equal_to());

            let filter = if let Some(elmis_code) = elmis_code.clone() {
                req_filter.elmis_code(EqualFilter::equal_to(&elmis_code))
            } else {
                req_filter.program_id(EqualFilter::equal_to(program_id))
            };

            let requisitions = get_latest_requisitions(connection, filter)?;

            let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_any(
                        requisitions
                            .iter()
                            .map(|r| r.requisition_row.id.clone())
                            .collect(),
                    ))
                    .item_id(EqualFilter::equal_to(item_id)),
            )?;

            if let Some(requisition_line) = requisition_lines.first() {
                amc = requisition_line
                    .requisition_line_row
                    .average_monthly_consumption;
                date_range = Some(requisition_line.requisition_row.created_datetime);
                break;
            }
        }

        item_info.insert(
            customer.id.clone(),
            RequisitionItemInformation {
                id: customer.id.clone(),
                amc_in_units: amc,
                stock_in_units: 0.0,
                adjustments_in_units: 0.0,
                date_range,
            },
        );
    }

    let area_amc = item_info.values().map(|info| info.amc_in_units).sum();

    // Store information
    let store_info = get_store_information(
        ctx,
        store_id,
        item_id,
        area_amc,
        period.start_date,
        period.end_date,
    )?;
    item_info.insert(store_info.id.clone(), store_info);

    Ok(item_info.into_values().collect())
}

fn get_latest_requisitions(
    connection: &StorageConnection,
    filter: RequisitionFilter,
) -> Result<Vec<Requisition>, RepositoryError> {
    let requisitions = RequisitionRepository::new(connection).query_by_filter(filter)?;

    let mut latest_requisitions: HashMap<String, Requisition> = HashMap::new();

    for requisition in requisitions {
        let customer_id = requisition.requisition_row.name_link_id.clone();
        let latest_requisition = latest_requisitions
            .entry(customer_id.clone())
            .or_insert(requisition.clone());

        if let Some(finalised_datetime) = requisition.requisition_row.finalised_datetime {
            if let Some(latest_finalised_datetime) =
                latest_requisition.requisition_row.finalised_datetime
            {
                if finalised_datetime > latest_finalised_datetime {
                    *latest_requisition = requisition.clone();
                }
            } else {
                *latest_requisition = requisition.clone();
            }
        } else if let Some(sent_datetime) = requisition.requisition_row.sent_datetime {
            if let Some(latest_sent_datetime) = latest_requisition.requisition_row.sent_datetime {
                if sent_datetime > latest_sent_datetime {
                    *latest_requisition = requisition.clone();
                }
            } else {
                *latest_requisition = requisition.clone();
            }
        } else if requisition.requisition_row.created_datetime
            > latest_requisition.requisition_row.created_datetime
        {
            *latest_requisition = requisition.clone();
        }
    }

    Ok(latest_requisitions.into_values().collect())
}

fn get_store_information(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    area_amc: f64,
    start_date: NaiveDate,
    end_date: NaiveDate,
) -> Result<RequisitionItemInformation, RepositoryError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);
    let date_range_filter = DatetimeFilter::date_range(start_date.into(), end_date.into());

    let additions_in_units: f64 = invoice_line_repo
        .query_by_filter(
            InvoiceLineFilter::new()
                .invoice_type(InvoiceType::InboundShipment.equal_to())
                .item_id(EqualFilter::equal_to(item_id))
                .store_id(EqualFilter::equal_to(store_id))
                .delivered_datetime(date_range_filter.clone()),
        )?
        .iter()
        .map(|l| l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size)
        .sum();
    let losses_in_units: f64 = invoice_line_repo
        .query_by_filter(
            InvoiceLineFilter::new()
                .invoice_type(InvoiceType::OutboundShipment.equal_to())
                .item_id(EqualFilter::equal_to(item_id))
                .store_id(EqualFilter::equal_to(store_id))
                .picked_datetime(date_range_filter.clone()),
        )?
        .iter()
        .map(|l| l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size)
        .sum();

    let inventory_adjustments = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new()
            .invoice_type(InvoiceType::equal_any(vec![
                InvoiceType::InventoryAddition,
                InvoiceType::InventoryReduction,
            ]))
            .item_id(EqualFilter::equal_to(item_id))
            .store_id(EqualFilter::equal_to(store_id))
            .verified_datetime(DatetimeFilter::date_range(
                start_date.into(),
                end_date.into(),
            )),
    )?;

    let adjustments_in_units: f64 = inventory_adjustments
        .iter()
        .map(|l| {
            if l.invoice_row.r#type == InvoiceType::InventoryAddition {
                l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size
            } else {
                -l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size
            }
        })
        .sum();

    let store_name = StoreRepository::new(&ctx.connection)
        .query_one(StoreFilter::new().id(EqualFilter::equal_to(store_id)))?
        .ok_or(RepositoryError::NotFound)?
        .name_row;

    let ledger = get_item_ledger(
        &ctx.connection,
        store_id,
        None,
        Some(
            LedgerFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .item_id(EqualFilter::equal_to(item_id))
                .datetime(DatetimeFilter::before_or_equal_to(end_date.into())),
        ),
        Some(LedgerSort {
            key: LedgerSortField::Datetime,
            desc: Some(false),
        }),
    )
    .map(|r| r.rows.into_iter().last())
    .map_err(|e| match e {
        ListError::DatabaseError(e) => e,
        _ => RepositoryError::NotFound,
    })?;

    Ok(RequisitionItemInformation {
        id: store_name.id.clone(),
        amc_in_units: area_amc,
        stock_in_units: ledger.map_or(0.0, |l| l.balance),
        adjustments_in_units: additions_in_units + losses_in_units + adjustments_in_units,
        date_range: end_date.and_hms_opt(0, 0, 0),
    })
}
