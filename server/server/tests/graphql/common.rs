macro_rules! get_invoice_inline {
    ($filter:expr, $connection:expr) => {{
        repository::InvoiceQueryRepository::new($connection)
            .query(repository::Pagination::one(), Some($filter), None)
            .unwrap()
            .pop()
            .unwrap()
    }};
}

macro_rules! get_invoice_lines_inline {
    ($invoice_id:expr, $connection:expr) => {{
        repository::InvoiceLineRowRepository::new($connection)
            .find_many_by_invoice_id($invoice_id)
            .unwrap()
    }};
}

macro_rules! get_stock_line_inline {
    ($stock_line_id:expr, $connection:expr) => {{
        repository::StockLineRowRepository::new($connection)
            .find_one_by_id($stock_line_id)
            .unwrap()
    }};
}

macro_rules! get_invoice_line_inline {
    ($invoice_line_id:expr, $connection:expr) => {{
        repository::InvoiceLineRowRepository::new($connection)
            .find_one_by_id($invoice_line_id)
            .unwrap()
    }};
}

macro_rules! get_name_inline {
    ($filter:expr, $connection:expr) => {{
        repository::NameQueryRepository::new($connection)
            .query(repository::Pagination::one(), Some($filter), None)
            .unwrap()
            .pop()
            .unwrap()
    }};
}

macro_rules! assert_unwrap_enum {
    ($enum:ident, $variant:path) => {{
        let debug = format!("{:#?}", $enum);

        if let $variant(result) = $enum {
            result
        } else {
            panic!("\ncannot unwrap {} from\n {}", stringify!($variant), debug);
        }
    }};
}

macro_rules! assert_matches {
    ($enum:ident, $variant:pat_param) => {{
        let debug = format!("{:#?}", $enum);

        match $enum {
            $variant => {}
            _ => {
                panic!(
                    "\nwrong enum variant {} in\n {}",
                    stringify!($variant),
                    debug
                );
            }
        }
    }};
}

macro_rules! assert_unwrap_optional_key {
    ($option:ident, $key:ident) => {{
        let debug = format!("{:#?}", $option);

        if let Some(result) = $option.$key {
            result
        } else {
            panic!(
                "\ncannot unwrap Some(value) of key '{}' in\n {}",
                stringify!($key),
                debug
            );
        }
    }};
}

pub fn compare_option<A, B>(a: &Option<A>, b: &B) -> bool
where
    B: PartialEq<A>,
{
    if let Some(a) = a {
        b == a
    } else {
        true
    }
}

pub(crate) use assert_matches;
pub(crate) use assert_unwrap_enum;
pub(crate) use assert_unwrap_optional_key;
pub(crate) use get_invoice_inline;
pub(crate) use get_invoice_line_inline;
pub(crate) use get_invoice_lines_inline;
pub(crate) use get_name_inline;
pub(crate) use get_stock_line_inline;
