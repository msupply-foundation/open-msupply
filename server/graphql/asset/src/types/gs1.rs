use async_graphql::*;
use util::GS1DataElement as DomainGS1DataElement;

#[derive(InputObject, Clone)]
pub struct GS1DataElement {
    ai: String,
    data: String,
}

impl GS1DataElement {
    pub fn to_domain(self) -> DomainGS1DataElement {
        DomainGS1DataElement {
            ai: self.ai.clone(),
            data: self.data.clone(),
        }
    }
}
