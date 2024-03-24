use crate::CurrencyRow;

pub fn currency_a() -> CurrencyRow {
    CurrencyRow {
        id: String::from("currency_a"),
        code: String::from("USD"),
        rate: 1.0,
        is_home_currency: true,
        date_updated: None,
    }
}

pub fn currency_b() -> CurrencyRow {
    CurrencyRow {
        id: String::from("currency_b"),
        code: String::from("EUR"),
        rate: 0.9,
        is_home_currency: false,
        date_updated: None,
    }
}

pub fn mock_currencies() -> Vec<CurrencyRow> {
    vec![currency_a(), currency_b()]
}
