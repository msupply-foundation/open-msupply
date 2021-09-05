use super::diesel_schema::item_line;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq)]
#[table_name = "item_line"]
pub struct ItemLineRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub batch: String,
    pub quantity: f64,
}
