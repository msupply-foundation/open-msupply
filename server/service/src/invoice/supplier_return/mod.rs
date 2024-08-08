pub mod delete;
pub mod generate_supplier_return_lines;
pub mod insert;
pub mod update;
pub mod update_lines;
pub mod update_name;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SupplierReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
}
