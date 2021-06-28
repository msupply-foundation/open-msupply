#[derive(sqlx::Type)]
#[sqlx(rename = "item_type")]
#[derive(Clone)]
pub enum ItemRowType {
    #[sqlx(rename = "general")]
    General,
    #[sqlx(rename = "service")]
    Service,
    #[sqlx(rename = "cross_reference")]
    CrossReference,
}

#[derive(Clone)]
pub struct ItemRow {
    pub id: String,
    pub item_name: String,
    pub type_of: ItemRowType,
}
