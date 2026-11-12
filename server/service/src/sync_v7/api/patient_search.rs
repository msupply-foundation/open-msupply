use repository::PatientFilter;
use serde::{Deserialize, Serialize};

use super::{ApiResponse, InteractiveError, SyncApiV7};
use crate::apis::patient_v4::PatientV4;

/// The body is the patient filter itself, with an optional page beside its
/// fields. A remote from before the page was added sends the filter alone and
/// gets every match, unsorted, as it always has; one that sends `limit` gets
/// that many, in name order, from `offset`. The central is always at least as
/// new as its remotes, so a remote can rely on the page being honoured.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Input {
    #[serde(flatten)]
    pub filter: PatientFilter,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
}

pub type Output = Vec<PatientV4>;
pub type Response = ApiResponse<Output>;

static ROUTE: &str = "patient_search";

impl SyncApiV7 {
    /// Someone is waiting on the result, so this gives up quickly when central can't be
    /// reached, rather than retrying like sync does.
    pub async fn patient_search(&self, input: Input) -> Result<Output, InteractiveError> {
        self.request_interactive(ROUTE, input).await
    }
}

#[cfg(test)]
mod test {
    use super::Input;
    use repository::{PatientFilter, StringFilter};

    // A remote from before the page was added sends the bare filter; the
    // central must still read it, with no page.
    #[test]
    fn reads_a_bare_filter_from_an_older_remote() {
        let filter = PatientFilter::new().last_name(StringFilter::starts_with("Tra"));
        let body = serde_json::to_string(&filter).unwrap();
        let input: Input = serde_json::from_str(&body).unwrap();
        assert_eq!(input.filter, filter);
        assert_eq!(input.limit, None);
        assert_eq!(input.offset, None);
    }

    // The page sits beside the filter's fields, not nested under a key.
    #[test]
    fn sends_the_page_beside_the_filter() {
        let input = Input {
            filter: PatientFilter::new().last_name(StringFilter::starts_with("Tra")),
            limit: Some(51),
            offset: Some(50),
        };
        let body: serde_json::Value = serde_json::to_value(&input).unwrap();
        assert_eq!(body["limit"], 51);
        assert_eq!(body["offset"], 50);
        assert!(body.get("last_name").is_some() || body.get("lastName").is_some());
        let back: Input = serde_json::from_value(body).unwrap();
        assert_eq!(back.filter, input.filter);
        assert_eq!(back.limit, Some(51));
    }
}
