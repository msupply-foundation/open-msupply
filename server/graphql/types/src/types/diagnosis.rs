use async_graphql::*;
use repository::diagnosis::Diagnosis;

pub struct DiagnosisNode {
    pub diagnosis: Diagnosis,
}

#[Object]
impl DiagnosisNode {
    pub async fn id(&self) -> &String {
        &self.diagnosis.id
    }

    pub async fn code(&self) -> &String {
        &self.diagnosis.code
    }

    pub async fn description(&self) -> &String {
        &self.diagnosis.description
    }
}

impl DiagnosisNode {
    pub fn from_domain(row: Diagnosis) -> DiagnosisNode {
        DiagnosisNode { diagnosis: row }
    }

    pub fn from_vec(variants: Vec<Diagnosis>) -> Vec<DiagnosisNode> {
        variants
            .into_iter()
            .map(DiagnosisNode::from_domain)
            .collect()
    }
}
