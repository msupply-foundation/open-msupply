use chrono::Utc;
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    ItemRowRepository, LocationMovementRow, NameRowRepository, NumberRowType, RepositoryError,
    StockLineRow,
};
use util::{constants::REPACK_NAME_CODE, inline_edit, uuid::uuid};

use crate::{number::next_number, service_provider::ServiceContext};

use super::{common::calculate_stock_line_total, insert::InsertRepack};

pub struct GenerateRepack {
    pub repack_invoice: InvoiceRow,
    pub repack_invoice_lines: Vec<InvoiceLineRow>,
    pub stock_lines: Vec<StockLineRow>,
    pub location_movement: Option<Vec<LocationMovementRow>>,
}

struct StockLineJob {
    new_stock_line: StockLineRow,
    stock_line_to_update: StockLineRow,
}

pub fn generate(
    ctx: &ServiceContext,
    stock_line: StockLineRow,
    input: InsertRepack,
) -> Result<GenerateRepack, RepositoryError> {
    let StockLineJob {
        stock_line_to_update,
        new_stock_line,
    } = generate_new_stock_lines(&stock_line, &input);

    let (repack_invoice, repack_invoice_lines) =
        generate_invoice_and_lines(&ctx, &stock_line, &new_stock_line)?;
    let location_movement = if let Some(_) = input.new_location_id {
        Some(generate_location_movement(
            &ctx.store_id,
            &stock_line,
            &new_stock_line,
        ))
    } else {
        None
    };

    let stock_lines = vec![stock_line_to_update, new_stock_line.clone()];

    Ok(GenerateRepack {
        repack_invoice,
        repack_invoice_lines,
        stock_lines,
        location_movement,
    })
}

fn generate_invoice_and_lines(
    ctx: &ServiceContext,
    stock_line: &StockLineRow,
    new_stock_line: &StockLineRow,
) -> Result<(InvoiceRow, Vec<InvoiceLineRow>), RepositoryError> {
    let connection = &ctx.connection;

    let repack_name = NameRowRepository::new(connection)
        .find_one_by_code(REPACK_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?;

    let invoice = InvoiceRow {
        id: uuid(),
        name_id: repack_name.id,
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
        .find_one_by_id(&stock_line.item_id)?
        .ok_or(RepositoryError::NotFound)?;

    let stock_in = InvoiceLineRow {
        id: uuid(),
        invoice_id: invoice.id.clone(),
        item_id: stock_line.item_id.clone(),
        item_name: item.name.clone(),
        item_code: item.code.clone(),
        stock_line_id: Some(new_stock_line.id.clone()),
        location_id: new_stock_line.location_id.clone(),
        batch: stock_line.batch.clone(),
        expiry_date: stock_line.expiry_date,
        pack_size: new_stock_line.pack_size,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: new_stock_line.total_number_of_packs,
        cost_price_per_pack: new_stock_line.cost_price_per_pack,
        sell_price_per_pack: new_stock_line.sell_price_per_pack,
        ..Default::default()
    };

    let stock_out = inline_edit(&stock_in, |mut l| {
        l.id = uuid();
        l.stock_line_id = Some(stock_line.id.clone());
        l.location_id = stock_line.location_id.clone();
        l.pack_size = stock_line.pack_size;
        l.r#type = InvoiceLineRowType::StockOut;
        l.number_of_packs = new_stock_line.pack_size as f64 * new_stock_line.total_number_of_packs;
        l.cost_price_per_pack = stock_line.cost_price_per_pack;
        l.sell_price_per_pack = stock_line.sell_price_per_pack;

        l
    });

    invoice_lines.push(stock_in);
    invoice_lines.push(stock_out);

    Ok((invoice, invoice_lines))
}

fn generate_new_stock_lines(stock_line: &StockLineRow, input: &InsertRepack) -> StockLineJob {
    let stock_line_total = calculate_stock_line_total(stock_line);

    let stock_line_to_update = if stock_line_total == input.number_of_packs {
        let mut new_line = stock_line.clone();

        new_line.available_number_of_packs = 0.0;
        new_line.total_number_of_packs = 0.0;

        new_line
    } else {
        let mut new_line = stock_line.clone();

        new_line.available_number_of_packs =
            new_line.available_number_of_packs - input.number_of_packs;
        new_line.total_number_of_packs = new_line.total_number_of_packs - input.number_of_packs;

        new_line
    };

    let new_stock_line = {
        let mut new_line = stock_line.clone();

        new_line.id = uuid();
        new_line.pack_size = input.new_pack_size;
        new_line.available_number_of_packs =
            input.number_of_packs * stock_line.pack_size as f64 / input.new_pack_size as f64;
        new_line.total_number_of_packs =
            input.number_of_packs * stock_line.pack_size as f64 / input.new_pack_size as f64;

        if stock_line.pack_size > input.new_pack_size {
            let difference = stock_line.pack_size as f64 / input.new_pack_size as f64;
            new_line.cost_price_per_pack = stock_line.cost_price_per_pack / difference;
            new_line.sell_price_per_pack = stock_line.sell_price_per_pack / difference;
        } else {
            let difference = input.new_pack_size as f64 / stock_line.pack_size as f64;
            new_line.cost_price_per_pack = stock_line.cost_price_per_pack * difference;
            new_line.sell_price_per_pack = stock_line.sell_price_per_pack * difference;
        }

        if input.new_location_id.is_some() {
            new_line.location_id = input.new_location_id.clone();
        }

        new_line
    };

    StockLineJob {
        new_stock_line,
        stock_line_to_update,
    }
}

pub fn generate_location_movement(
    store_id: &str,
    stock_line: &StockLineRow,
    new_stock_line: &StockLineRow,
) -> Vec<LocationMovementRow> {
    let mut location_movement = Vec::new();

    location_movement.push(LocationMovementRow {
        id: uuid(),
        store_id: store_id.to_string(),
        stock_line_id: stock_line.id.clone(),
        location_id: stock_line.location_id.clone(),
        enter_datetime: None,
        exit_datetime: Some(Utc::now().naive_utc()),
    });

    location_movement.push(LocationMovementRow {
        id: uuid(),
        store_id: store_id.to_string(),
        stock_line_id: new_stock_line.id.clone(),
        location_id: new_stock_line.location_id.clone(),
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    });

    location_movement
}
