use async_graphql::Object;

pub struct Mutations;

#[Object]
impl Mutations {
    #[allow(non_snake_case)]
    pub async fn apiVersion(&self) -> String {
        "1.0".to_string()
    }
}
