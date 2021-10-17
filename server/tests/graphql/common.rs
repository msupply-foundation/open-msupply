use serde::{de::DeserializeOwned, Serialize};

macro_rules! get_invoice_inline {
    ($filter:expr, $connection:expr) => {{
        remote_server::database::repository::InvoiceQueryRepository::new($connection)
            .query(Pagination::one(), Some($filter), None)
            .unwrap()
            .pop()
            .unwrap()
    }};
}

macro_rules! get_invoice_lines_inline {
    ($invoice_id:expr, $connection:expr) => {{
        remote_server::database::repository::InvoiceLineRepository::new($connection)
            .find_many_by_invoice_id($invoice_id)
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

pub fn convert_graphql_client_type<FROM, TO>(f: FROM) -> TO
where
    FROM: Serialize,
    TO: DeserializeOwned,
{
    serde_json::from_str(&serde_json::to_string(&f).unwrap()).unwrap()
}

pub(crate) use assert_matches;
pub(crate) use assert_unwrap_enum;
pub(crate) use assert_unwrap_optional_key;
pub(crate) use get_invoice_inline;
pub(crate) use get_invoice_lines_inline;
