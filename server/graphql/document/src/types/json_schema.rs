use async_graphql::*;
use repository::JSONSchema;

pub struct JSONSchemaNode {
    pub schema: JSONSchema,
}

#[Object]
impl JSONSchemaNode {
    pub async fn id(&self) -> &str {
        &self.schema.id
    }

    pub async fn schema(&self) -> &serde_json::Value {
        &self.schema.schema
    }
}
