use chrono::NaiveDate;

pub mod delete;
pub mod generate_lines;
pub mod insert;
pub mod update;
pub mod update_lines;

pub use self::delete::*;
pub use self::generate_lines::*;
pub use self::update::*;
pub use self::update_lines::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CustomerReturnLineInput {
    pub id: String,
    pub item_id: String,
    pub stock_line_id: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
    pub pack_size: f64,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub item_variant_id: Option<String>,
}
