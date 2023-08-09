use async_graphql::*;

use repository::ProgramRow;

pub struct ProgramNode {
    pub program_row: ProgramRow,
}

#[Object]
impl ProgramNode {
    pub async fn id(&self) -> &str {
        &self.program_row.id
    }

    pub async fn name(&self) -> &str {
        &self.program_row.name
    }
}
