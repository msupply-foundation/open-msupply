use chrono::Utc;
use repository::{
    ActivityLogRow, ActivityLogType, InvoiceLineRow, InvoiceLineRowType, InvoiceRow,
    InvoiceRowStatus, InvoiceRowType, ItemRowRepository, LocationMovementRow, NameRowRepository,
    NumberRowType, RepositoryError, StockLine, StockLineRow,
};
use util::{constants::REPACK_NAME_CODE, uuid::uuid};

use crate::{number::next_number, service_provider::ServiceContext};

use super::insert::InsertRepack;

pub struct GenerateRepack {
    pub repack_invoice: InvoiceRow,
    pub repack_invoice_lines: Vec<InvoiceLineRow>,
    pub stock_lines: Vec<StockLineRow>,
    pub location_movement: Option<LocationMovementRow>,
    pub activity_log: ActivityLogRow,
}

struct StockLineJob {
    new_stock_line: StockLineRow,
    stock_line_to_update: StockLineRow,
}

pub fn generate(
    ctx: &ServiceContext,
    stock_line: StockLine,
    input: InsertRepack,
) -> Result<GenerateRepack, RepositoryError> {
    let StockLineJob {
        stock_line_to_update,
        new_stock_line,
    } = generate_new_stock_lines(&stock_line.stock_line_row, &input);

    let (repack_invoice, repack_invoice_lines) =
        generate_invoice_and_lines(&ctx, input.number_of_packs, &stock_line, &new_stock_line)?;
    let location_movement = if let Some(_) = input.new_location_id {
        Some(generate_location_movement(&ctx.store_id, &new_stock_line))
    } else {
        None
    };

    let stock_lines = vec![stock_line_to_update.clone(), new_stock_line.clone()];

    let activity_log = ActivityLogRow {
        id: uuid(),
        r#type: ActivityLogType::Repack,
        user_id: Some(ctx.user_id.clone()),
        store_id: Some(ctx.store_id.clone()),
        record_id: Some(new_stock_line.id),
        datetime: Utc::now().naive_utc(),
        changed_from: Some(stock_line_to_update.id),
        changed_to: None,
    };

    Ok(GenerateRepack {
        repack_invoice,
        repack_invoice_lines,
        stock_lines,
        location_movement,
        activity_log,
    })
}

fn generate_invoice_and_lines(
    ctx: &ServiceContext,
    number_of_packs_input: f64,
    stock_line_to_update: &StockLine,
    new_stock_line: &StockLineRow,
) -> Result<(InvoiceRow, Vec<InvoiceLineRow>), RepositoryError> {
    let connection = &ctx.connection;

    let repack_name = NameRowRepository::new(connection)
        .find_one_by_code(REPACK_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?;

    let invoice = InvoiceRow {
        id: uuid(),
        name_link_id: repack_name.id,
        store_id: ctx.store_id.clone(),
        user_id: Some(ctx.user_id.clone()),
        invoice_number: next_number(connection, &NumberRowType::Repack, &ctx.store_id)?,
        r#type: InvoiceRowType::Repack,
        status: InvoiceRowStatus::Verified,
        on_hold: false,
        created_datetime: Utc::now().naive_utc(),
        verified_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    };

    let mut invoice_lines = Vec::new();

    let item = ItemRowRepository::new(connection)
        .find_active_by_id(&stock_line_to_update.item_row.id)?
        .ok_or(RepositoryError::NotFound)?;

    let stock_line_to_update_row = &stock_line_to_update.stock_line_row;
    let stock_in = InvoiceLineRow {
        id: uuid(),
        invoice_id: invoice.id.clone(),
        item_link_id: stock_line_to_update.item_row.id.clone(),
        item_name: item.name.clone(),
        item_code: item.code.clone(),
        stock_line_id: Some(new_stock_line.id.clone()),
        location_id: new_stock_line.location_id.clone(),
        batch: stock_line_to_update_row.batch.clone(),
        expiry_date: stock_line_to_update_row.expiry_date,
        pack_size: new_stock_line.pack_size,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: new_stock_line.total_number_of_packs,
        cost_price_per_pack: new_stock_line.cost_price_per_pack,
        sell_price_per_pack: new_stock_line.sell_price_per_pack,
        total_before_tax: new_stock_line.cost_price_per_pack
            * new_stock_line.total_number_of_packs as f64,
        total_after_tax: new_stock_line.cost_price_per_pack
            * new_stock_line.total_number_of_packs as f64,
        ..Default::default()
    };

    let stock_out = InvoiceLineRow {
        id: uuid(),
        stock_line_id: Some(stock_line_to_update_row.id.clone()),
        location_id: stock_line_to_update_row.location_id.clone(),
        pack_size: stock_line_to_update_row.pack_size,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: number_of_packs_input,
        cost_price_per_pack: stock_line_to_update_row.cost_price_per_pack,
        sell_price_per_pack: stock_line_to_update_row.sell_price_per_pack,
        total_before_tax: stock_line_to_update_row.cost_price_per_pack
            * number_of_packs_input as f64,
        total_after_tax: stock_line_to_update_row.cost_price_per_pack
            * number_of_packs_input as f64,
        ..stock_in.clone()
    };

    invoice_lines.push(stock_in);
    invoice_lines.push(stock_out);

    Ok((invoice, invoice_lines))
}

fn generate_new_stock_lines(stock_line: &StockLineRow, input: &InsertRepack) -> StockLineJob {
    let stock_line_to_update = StockLineRow {
        available_number_of_packs: stock_line.available_number_of_packs - input.number_of_packs,
        total_number_of_packs: stock_line.total_number_of_packs - input.number_of_packs,
        ..stock_line.clone()
    };

    let new_stock_line = {
        let mut new_line = stock_line.clone();
        let difference = input.new_pack_size as f64 / stock_line.pack_size as f64;

        new_line.id = uuid();
        new_line.pack_size = input.new_pack_size;
        new_line.available_number_of_packs =
            input.number_of_packs * stock_line.pack_size as f64 / input.new_pack_size as f64;
        new_line.total_number_of_packs =
            input.number_of_packs * stock_line.pack_size as f64 / input.new_pack_size as f64;
        new_line.sell_price_per_pack = stock_line.sell_price_per_pack * difference;
        new_line.cost_price_per_pack = stock_line.cost_price_per_pack * difference;
        new_line.location_id = input.new_location_id.clone();

        new_line
    };

    StockLineJob {
        new_stock_line,
        stock_line_to_update,
    }
}

pub fn generate_location_movement(
    store_id: &str,
    new_stock_line: &StockLineRow,
) -> LocationMovementRow {
    LocationMovementRow {
        id: uuid(),
        store_id: store_id.to_string(),
        stock_line_id: new_stock_line.id.clone(),
        location_id: new_stock_line.location_id.clone(),
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    }
}
