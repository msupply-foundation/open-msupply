use repository::StockLineRow;

pub fn calculate_stock_line_total(stock_line: &StockLineRow) -> f64 {
    stock_line.available_number_of_packs * stock_line.pack_size as f64
}
