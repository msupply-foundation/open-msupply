use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

pub type LoginV4Error = anyhow::Error;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum LoginUserTypeV4 {
    #[serde(alias = "user")]
    User,
    #[serde(other)]
    Unknown,
}

#[derive(Clone, Debug, Deserialize)]
pub enum LoginStatusV4 {
    #[serde(alias = "success")]
    Success,
    #[serde(other)]
    Unknown,
}

#[derive(Clone, Debug, Serialize)]
pub struct LoginInputV4 {
    username: String,
    password: String,
    login_type: LoginUserTypeV4,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoginUserV4 {
    #[serde(rename = "ID")]
    id: String,
    name: String,
    startup_method: String,
    //Signature: "[object Picture]",
    nblogins: String,
    //lastlogin: "2020-03-24",
    group_id: String,
    mode: String,
    // qdump_offset_b: null,
    active: bool,
    // permissions_spare: null,
    lasttime: i32,
    initials: String,
    first_name: String,
    last_name: String,
    //date_of_birth: "0000-00-00",
    address_1: String,
    address_2: String,
    e_mail: String,
    phone1: String,
    phone2: String,
    //date_created: "2017-10-11",
    //date_left: "0000-00-00",
    job_title: String,
    responsible_officer: bool,
    Language: i32,
    use_ldap: bool,
    ldap_login_string: String,
    receives_sms_errors: bool,
    is_group: bool,
    // dashboard_tabs: { "tabs": [] },
    // custom_data: null,
    windows_user_name: String,
    license_category_id: String,
    // tags: { "tags": [] },
    // type: { "types": ["desktop"]},
    isInactiveAuthoriser: bool,
    spare_1: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoginUserStoresV4 {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "user_ID")]
    user_id: String,
    #[serde(rename = "store_ID")]
    store_id: String,
    can_login: bool,
    store_default: bool,
    can_action_replenishments: bool,
    permissions: Vec<bool>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoginUserInfoV4 {
    user: LoginUserV4,
    user_stores: Vec<LoginUserStoresV4>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct LoginResponseV4 {
    status: LoginStatusV4,
    authenticated: bool,
    username: String,
    userFirstName: String,
    userLastName: String,
    userJobTitle: String,
    userType: LoginUserTypeV4,
    service: String,
    storeName: String,
    userInfo: Option<LoginUserInfoV4>,
}

pub struct LoginApiV4 {
    server_url: Url,
    client: Client,
}

impl LoginApiV4 {
    pub async fn login(&self, input: LoginInputV4) -> Result<LoginResponseV4, LoginV4Error> {
        let response = self
            .client
            .post(self.server_url.join("/api/v4/login")?)
            .json(&input)
            .send()
            .await?
            .error_for_status()?;

        let response = response.json().await?;
        Ok(response)
    }
}
