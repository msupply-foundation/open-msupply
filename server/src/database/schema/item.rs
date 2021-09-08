use super::diesel_schema::item;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Clone, Debug, PartialEq, Eq)]
pub enum ItemRowType {
    General,
    Service,
    CrossReference,
    NoneStock,
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "item"]
pub struct ItemRow {
    pub id: String,
    pub item_name: String,
    pub type_of: ItemRowType,
}
