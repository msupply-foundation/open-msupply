use chrono::NaiveDate;

pub mod generate_lines;
pub mod insert;
pub mod update_lines;

pub mod update;
pub use self::generate_lines::*;
pub use self::update::*;
pub use self::update_lines::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InboundReturnLineInput {
    pub id: String,
    pub item_id: String,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
    pub pack_size: u32,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
}
