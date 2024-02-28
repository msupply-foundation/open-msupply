pub mod generate_outbound_return_lines;
pub mod insert;
pub mod update;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct OutboundReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
}
