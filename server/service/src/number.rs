use repository::{
    schema::{NumberRow, NumberRowType},
    NumberRowRepository, RepositoryError,
};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

pub fn next_number(
    ctx: &ServiceContext,
    r#type: &NumberRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    // Should be done in transaction
    let next_number = ctx.transaction(|ctx| {
        let repo = NumberRowRepository::new(&ctx.connection);

        let updated_number_row = match repo.find_one_by_type_and_store(r#type, store_id)? {
            Some(mut row) => {
                // update existing counter
                row.value = row.value + 1;
                repo.upsert_one(&row)?;
                row
            }
            None => {
                // insert new counter
                let row = NumberRow {
                    id: uuid(),
                    value: 1,
                    r#type: r#type.clone(),
                    store_id: store_id.to_owned(),
                };
                repo.upsert_one(&row)?;
                row
            }
        };
        Ok(updated_number_row.value)
    })?;
    Ok(next_number)
}
