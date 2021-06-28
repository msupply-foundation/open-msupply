#[derive(sqlx::Type)]
#[sqlx(rename = "requisition_type")]
#[derive(Clone)]
pub enum RequisitionRowType {
    #[sqlx(rename = "imprest")]
    Imprest,
    #[sqlx(rename = "stock_history")]
    StockHistory,
    #[sqlx(rename = "request")]
    Request,
    #[sqlx(rename = "response")]
    Response,
    #[sqlx(rename = "supply")]
    Supply,
    #[sqlx(rename = "report")]
    Report,
}

#[derive(Clone)]
pub struct RequisitionRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub type_of: RequisitionRowType,
}
