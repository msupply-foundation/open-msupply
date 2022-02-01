pub struct GenerateCalculatedQuantity {
    pub average_monthly_consumption: i32,
    pub stock_on_hand: i32,
    pub threshold_months_of_stock: f64,
    pub max_months_of_stock: f64,
}

pub fn generate_calculated_quantity(
    GenerateCalculatedQuantity {
        average_monthly_consumption,
        stock_on_hand,
        threshold_months_of_stock,
        max_months_of_stock,
    }: GenerateCalculatedQuantity,
) -> i32 {
    if average_monthly_consumption == 0 {
        return 0;
    }
    let months_of_stock = stock_on_hand as f64 / average_monthly_consumption as f64;

    if months_of_stock > threshold_months_of_stock || months_of_stock > max_months_of_stock {
        return 0;
    }

    (max_months_of_stock - months_of_stock * average_monthly_consumption as f64) as i32
}
