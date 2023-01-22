use chrono::NaiveDate;
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

pub struct PatientApiV4 {
    server_url: Url,
    client: Client,
}

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
    pub date_of_birth: String,
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
    pub fn new(client: Client, server_url: Url) -> Self {
        PatientApiV4 { server_url, client }
    }

    /// Creates a name_store_join.
    /// Requires the sync site credentials for authentication.
    pub async fn name_store_join(
        &self,
        site_name: &str,
        password_sha256: &str,
        body: NameStoreJoinParamsV4,
    ) -> Result<NameStoreJoinV2, PatientV4Error> {
        let response = self
            .client
            .post(self.server_url.join("/api/v4/name_store_join").unwrap())
            .json(&body)
            .basic_auth(site_name, Some(password_sha256))
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

    pub async fn patient(
        &self,
        username: &str,
        password_sha256: &str,
        params: PatientParamsV4,
    ) -> Result<Vec<PatientV4>, PatientV4Error> {
        let PatientParamsV4 {
            limit,
            offset,
            first_name,
            last_name,
            dob,
            policy_number,
            barcode,
            is_deleted,
            code,
        } = params;
        let mut query = vec![];
        if let Some(limit) = limit {
            query.push(("limit".to_string(), format!("{}", limit)))
        }
        if let Some(offset) = offset {
            query.push(("offset".to_string(), format!("{}", offset)))
        }
        if let Some(first_name) = first_name {
            query.push(("first_name".to_string(), first_name))
        }
        if let Some(last_name) = last_name {
            query.push(("last_name".to_string(), last_name))
        }
        if let Some(dob) = dob {
            query.push(("dob".to_string(), dob.format("%d%m%Y").to_string()))
        }
        if let Some(policy_number) = policy_number {
            query.push(("policy_number".to_string(), policy_number))
        }
        if let Some(barcode) = barcode {
            query.push(("barcode".to_string(), barcode))
        }
        if let Some(is_deleted) = is_deleted {
            query.push(("is_deleted".to_string(), format!("{}", is_deleted)))
        }
        if let Some(code) = code {
            query.push(("code".to_string(), code))
        }

        let response = self
            .client
            .get(self.server_url.join("/api/v4/patient").unwrap())
            .basic_auth(username, Some(password_sha256))
            .query(&query)
            .send()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?
            .json()
            .await
            .map_err(|e| PatientV4Error::ConnectionError(e))?;

        Ok(response)
    }
}
