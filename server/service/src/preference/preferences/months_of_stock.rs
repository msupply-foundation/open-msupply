use super::Preference;

pub struct MonthsOfStock;

impl Preference for MonthsOfStock {
    type Value = i32;

    fn key() -> &'static str {
        "months_of_stock"
    }

    // todo
    fn json_forms_input_type() -> String {
        "number".to_string()
    }
}
