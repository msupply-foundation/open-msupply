mod mutations;
use self::mutations::*;
use async_graphql::*;

#[derive(Default, Clone)]
pub struct ContactFormMutations;

#[Object]
impl ContactFormMutations {
    async fn insert_contact_form(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertContactFormResponse> {
        insert_contact_form(ctx, &store_id, input)
    }
}
