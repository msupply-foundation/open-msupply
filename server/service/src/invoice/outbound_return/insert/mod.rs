#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundReturn {
    pub id: String,
    pub other_party_id: String,
    pub outbound_return_lines: Vec<InsertOutboundReturnLine>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundReturnLine {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: String,
}
