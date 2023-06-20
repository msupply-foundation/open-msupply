use chrono::NaiveDate;
use reqwest::{Client, Url};
use serde::{Deserialize, Deserializer, Serialize};

pub struct PatientApiV4 {
    server_url: Url,
    client: Client,
    /// Username to authenticate with the central server. For the backend this is usually the site
    /// name.
    username: String,
    /// For example, the site password which is also used for sync.
    password_sha256: String,
}

#[derive(Serialize)]
pub struct PatientParamsV4 {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub dob: Option<NaiveDate>,
    pub policy_number: Option<String>,
    pub barcode: Option<String>,
    pub is_deleted: Option<bool>,
    pub code: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct PatientInsurance {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "insuranceProviderID")]
    pub insurance_provider_id: String,
    #[serde(rename = "nameID")]
    pub name_id: String,
    #[serde(rename = "isActive")]
    pub is_active: String,
    #[serde(rename = "policyNumberFamily")]
    pub policy_number_family: String,
    #[serde(rename = "policyNumberPerson")]
    pub policy_number_person: String,
    pub r#type: String,
    #[serde(rename = "discountRate")]
    pub discount_rate: String,
    #[serde(rename = "expiryDate")]
    pub expiry_date: String,
    #[serde(rename = "policyNumberFull")]
    pub policy_number_full: String,
    #[serde(rename = "enteredByID")]
    pub entered_by_id: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct PatientV4 {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
    pub phone: String,
    pub customer: bool,
    pub bill_address1: String,
    pub supplier: bool,
    pub email: String,
    pub code: String,
    pub last: String,
    pub first: String,
    #[serde(deserialize_with = "date_of_birth")]
    pub date_of_birth: Option<NaiveDate>,
    pub r#type: String,
    pub manufacturer: bool,
    pub bill_address3: String,
    pub bill_address4: String,
    pub bill_postal_zip_code: String,
    pub supplying_store_id: String,
    #[serde(rename = "nameInsuranceJoin")]
    pub name_insurance_join: Vec<PatientInsurance>,
}

#[derive(Clone, Debug, Serialize)]
pub struct NameStoreJoinParamsV4 {
    #[serde(rename = "name_ID")]
    pub name_id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct NameStoreJoinV2 {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "name_ID")]
    pub name_id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    pub inactive: bool,
}

#[derive(Debug)]
pub enum PatientV4Error {
    AuthenticationFailed,
    InvalidResponse(serde_json::Error),
    ConnectionError(reqwest::Error),
}

impl PatientApiV4 {
    pub fn new(client: Client, server_url: Url, username: &str, password_sha256: &str) -> Self {
        PatientApiV4 {
            server_url,
            client,
            username: username.to_string(),
            password_sha256: password_sha256.to_string(),
        }
    }

    /// Creates a name_store_join.
    /// Requires the sync site credentials for authentication.
    pub async fn name_store_join(
        &self,
        body: NameStoreJoinParamsV4,
    ) -> Result<NameStoreJoinV2, PatientV4Error> {
        let response = self
            .client
            .post(self.server_url.join("/api/v4/name_store_join").unwrap())
            .json(&body)
            .basic_auth(&self.username, Some(&self.password_sha256))
            .send()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?
            .text()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?;
        if response == "Authentication failed" {
            return Err(PatientV4Error::AuthenticationFailed);
        }
        Ok(serde_json::from_str(&response).map_err(|err| PatientV4Error::InvalidResponse(err))?)
    }

    pub async fn patient(&self, params: PatientParamsV4) -> Result<Vec<PatientV4>, PatientV4Error> {
        let response = self
            .client
            .get(self.server_url.join("/api/v4/patient").unwrap())
            .basic_auth(&self.username, Some(&self.password_sha256))
            .query(&params)
            .send()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?
            .json()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?;

        Ok(response)
    }
}

pub fn date_of_birth<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00T00:00:00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S").ok()))
}
