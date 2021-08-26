use super::diesel_schema::item;
use diesel_derive_enum::DbEnum;

#[derive(sqlx::Type)]
#[sqlx(rename = "item_type")]
#[derive(DbEnum, Clone, Debug)]
pub enum ItemRowType {
    #[sqlx(rename = "general")]
    General,
    #[sqlx(rename = "service")]
    Service,
    #[sqlx(rename = "cross_reference")]
    CrossReference,
}

#[derive(Clone, Insertable, Queryable)]
#[table_name = "item"]
pub struct ItemRow {
    pub id: String,
    pub item_name: String,
    pub type_of: ItemRowType,
}
