use crate::CurrencyRow;

pub fn currency_a() -> CurrencyRow {
    CurrencyRow {
        id: String::from("currency_a"),
        code: String::from("USD"),
        rate: 1.0,
        is_home_currency: true,
        date_updated: None,
        is_active: true,
    }
}

pub fn currency_b() -> CurrencyRow {
    CurrencyRow {
        id: String::from("currency_b"),
        code: String::from("EUR"),
        rate: 0.9,
        is_home_currency: false,
        date_updated: None,
        is_active: true,
    }
}

pub fn currency_c() -> CurrencyRow {
    CurrencyRow {
        id: String::from("NEW_ZEALAND_DOLLARS"),
        code: String::from("NZD"),
        rate: 1.6,
        is_home_currency: false,
        date_updated: None,
        is_active: true,
    }
}

pub fn currency_d() -> CurrencyRow {
    CurrencyRow {
        id: String::from("AUSTRALIAN_DOLLAR"),
        code: String::from("AUD"),
        rate: 1.4,
        is_home_currency: false,
        date_updated: None,
        is_active: true,
    }
}

pub fn mock_currencies() -> Vec<CurrencyRow> {
    vec![currency_a(), currency_b()]
}
