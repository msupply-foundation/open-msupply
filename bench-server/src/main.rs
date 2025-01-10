use std::{
    future::Future,
    time::{Duration, SystemTime},
};

use anyhow::Context;
use reqwest::{Client, Response, StatusCode, Url};
use serde::{Deserialize, Serialize};
use tokio::task::JoinSet;

const AUTH_QUERY: &str = r#"
query AuthToken($username: String!, $password: String) {
  root: authToken(password: $password, username: $username) {
    ... on AuthToken {
      __typename
      token
    }
    ... on AuthTokenError {
      __typename
      error {
        description
      }
    }
  }
}
"#;

const CREATE_INTENRAL_ORDER: &str = r#"
mutation insertRequest($storeId: String!, $input: InsertRequestRequisitionInput!) {
   root: insertRequestRequisition(input: $input, storeId: $storeId) {
    ... on RequisitionNode {
      __typename
      id
      requisitionNumber
    }
    ... on InsertRequestRequisitionError {
      __typename
      error {
        description
        ... on OtherPartyNotASupplier {
          __typename
          description
        }
      }
    }
  }
}"#;

const INTERNAL_ORDERS: &str = r#"
query requests(
  $storeId: String!
  $filter: RequisitionFilterInput
  $page: PaginationInput
  $sort: [RequisitionSortInput!]
) {
  root: requisitions(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    ... on RequisitionConnector {
      __typename
      totalCount
      nodes {
        ...RequestRow
      }
    }
  }
}

fragment RequestRow on RequisitionNode {
  colour
  comment
  createdDatetime
  finalisedDatetime
  id
  otherPartyName
  requisitionNumber
  sentDatetime
  status
  theirReference
  type
  otherPartyId
  approvalStatus
  linkedRequisition {
    approvalStatus
  }
  programName
  period {
    name
    startDate
    endDate
  }
  orderType
}
"#;

const MASTER_LISTS: &str = r#"
query masterLists(
  $first: Int
  $offset: Int
  $key: MasterListSortFieldInput!
  $desc: Boolean
  $filter: MasterListFilterInput
  $storeId: String!
) {
 root: masterLists(
    filter: $filter
    page: { first: $first, offset: $offset }
    sort: { key: $key, desc: $desc }
    storeId: $storeId
  ) {
    ... on MasterListConnector {
      __typename
      totalCount
      nodes {
        ...MasterListRow
      }
    }
  }
}

fragment MasterListRow on MasterListNode {
  __typename
  name
  code
  description
  id
  linesCount
}
"#;

const REPORTS: &str = r#"
query reports(
  $storeId: String!
  $key: ReportSortFieldInput!
  $desc: Boolean
  $filter: ReportFilterInput
) {
  root: reports(
    storeId: $storeId
    sort: { key: $key, desc: $desc }
    filter: $filter
    userLanguage: "en"
  ) {
    ... on ReportConnector {
      __typename
      nodes {
        __typename
        ...ReportRow
      }
      totalCount
    }
  }
}

fragment ReportRow on ReportNode {
  context
  id
  name
  subContext
  isCustom
  argumentSchema {
    id
    type
    jsonSchema
    uiSchema
  }
}
"#;

const REQUEST_BY_NUMBER: &str = r#"
query requestByNumber($storeId: String!, $requisitionNumber: Int!) {
  root: requisitionByNumber(
    requisitionNumber: $requisitionNumber
    type: REQUEST
    storeId: $storeId
  ) {
    __typename
    ... on RequisitionNode {
      ...Request
      otherParty(storeId: $storeId) {
        __typename
        ... on NameNode {
          id
          name
          code
          isCustomer
          isSupplier
        }
      }
    }
    ... on RecordNotFound {
      __typename
      description
    }
  }
}

fragment Request on RequisitionNode {
  __typename
  id
  type
  status
  createdDatetime
  sentDatetime
  finalisedDatetime
  requisitionNumber
  colour
  theirReference
  comment
  otherPartyName
  otherPartyId
  maxMonthsOfStock
  minMonthsOfStock
  approvalStatus
  user {
    __typename
    username
    email
  }
  lines {
    __typename
    totalCount
    nodes {
      ...RequestLine
    }
  }
  shipments {
    __typename
    totalCount
    nodes {
      __typename
      id
      invoiceNumber
      createdDatetime
      user {
        __typename
        username
      }
    }
  }
  otherParty(storeId: $storeId) {
    id
    code
    isCustomer
    isSupplier
    isOnHold
    name
    store {
      id
      code
    }
  }
  linkedRequisition {
    approvalStatus
  }
  programName
  period {
    name
    startDate
    endDate
  }
  orderType
}

fragment RequestLine on RequisitionLineNode {
  id
  itemId
  requestedQuantity
  suggestedQuantity
  comment
  itemName
  itemStats {
    __typename
    availableStockOnHand
    availableMonthsOfStockOnHand
    averageMonthlyConsumption
  }
  linkedRequisitionLine {
    approvedQuantity
    approvalComment
  }
  item {
    ...ItemWithStats
  }
}

fragment ItemWithStats on ItemNode {
  id
  name
  code
  unitName
  defaultPackSize
  availableStockOnHand(storeId: $storeId)
  stats(storeId: $storeId) {
    averageMonthlyConsumption
    availableStockOnHand
    availableMonthsOfStockOnHand
    totalConsumption
  }
}
"#;

const SUPPLIER_PROGRAM_SETTINGS: &str = r#"
query supplierProgramSettings($storeId: String!) {
  root: supplierProgramRequisitionSettings(storeId: $storeId) {
    ...SupplierProgramSettings
  }
}

fragment SupplierProgramSettings on SupplierProgramRequisitionSettingNode {
  programName
  programId
  suppliers {
    ...NameRow
  }
  orderTypes {
    id
    name
    availablePeriods {
      id
      name
    }
  }
}

fragment NameRow on NameNode {
  code
  id
  isCustomer
  isSupplier
  isOnHold
  name
  store {
    id
    code
  }
}
"#;

const NAMES: &str = r#"
query names(
  $storeId: String!
  $key: NameSortFieldInput!
  $desc: Boolean
  $first: Int
  $offset: Int
  $filter: NameFilterInput
) {
  root: names(
    storeId: $storeId
    page: { first: $first, offset: $offset }
    sort: { key: $key, desc: $desc }
    filter: $filter
  ) {
    ... on NameConnector {
      __typename
      nodes {
        ...NameRow
      }
      totalCount
    }
  }
}

fragment NameRow on NameNode {
  code
  id
  isCustomer
  isSupplier
  isOnHold
  name
  store {
    id
    code
  }
}
"#;

const ADD_FROM_MASTER_LIST: &str = r#"
mutation addFromMasterList(
  $storeId: String!
  $requestId: String!
  $masterListId: String!
) {
   root: addFromMasterList(
    input: { requestRequisitionId: $requestId, masterListId: $masterListId }
    storeId: $storeId
  ) {
    ... on RequisitionLineConnector {
      __typename
      totalCount
    }
    ... on AddFromMasterListError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on CannotEditRequisition {
          __typename
          description
        }
        ... on MasterListNotFoundForThisStore {
          __typename
          description
        }
      }
    }
  }
}"#;

#[tokio::main]
async fn main() {
    let config = Config {
        url: "http://localhost:8000".to_string(),
        username: "dtac".to_string(),
        password: "pass".to_string(),
        store_id: "800BC536A8C542EF94F5A30FDA51FD92".to_string(),
        supplying_name_id: "EF54B258B86B8D4FABAB7B813BE41FE9".to_string(),
        master_list_id: "44562933CFD54CCFB00874BC4D2333EB".to_string(),
    };

    let mut set = JoinSet::new();

    let test = GqlTest(config.gql_url().unwrap(), 0);

    // TOKEN
    let token = test
        .gql(
            "token",
            AUTH_QUERY,
            serde_json::json! ({
              "username": config.username,
              "password": config.password,
            }),
            None,
            "AuthToken",
        )
        .await
        .unwrap()["token"]
        .as_str()
        .unwrap()
        .to_string();

    for task_number in 0..30 {
        let config_closure = config.clone();
        let token_closure = token.clone();
        set.spawn(async move { bench(config_closure, task_number, token_closure).await });
    }

    let mut errors = Vec::new();

    while let Some(res) = set.join_next().await {
        if let Err(error) = res.unwrap() {
            errors.push(error)
        }
    }

    for TaskError {
        task_number,
        description,
        error,
    } in errors
    {
        println!("Error at {task_number} - {description}");
        println!("{error:?}");
    }
}

async fn bench(config: Config, task_number: u32, token: String) -> Result<(), TaskError> {
    let test = GqlTest(config.gql_url().unwrap(), task_number + 1);

    // // TOKEN
    // let token = test
    //     .gql(
    //         "token",
    //         AUTH_QUERY,
    //         serde_json::json! ({
    //           "username": config.username,
    //           "password": config.password,
    //         }),
    //         None,
    //         "AuthToken",
    //     )
    //     .await?["token"]
    //     .as_str()
    //     .unwrap()
    //     .to_string();

    // GET INTERNAL ORDERS

    // This happens 2 time
    for i in 0..2 {
        test.gql(
            &format!("request orders {i}"),
            INTERNAL_ORDERS,
            serde_json::json! ({
            "storeId": config.store_id,
            "page": {
                "offset": 0,
                "first": 500
            },
            "sort": {
                "key": "createdDatetime",
                "desc": true
            },
            "filter": {
                "type": {
                "equalTo": "REQUEST"
                }
            }
            }),
            Some(token.clone()),
            "RequisitionConnector",
        )
        .await?;
    }

    // NAMES

    test.gql(
        &format!("names"),
        NAMES,
        serde_json::json! ({
        "key": "name",
        "desc": false,
        "storeId": config.store_id,
        "filter": {
            "isSupplier": true,
            "isStore": true
        },
        "first": 1000
        }),
        Some(token.clone()),
        "NameConnector",
    )
    .await?;

    // CREATE INTERNAL ORDER

    let order_id = uuid::Uuid::new_v4().to_string();
    let order_number = test
        .gql(
            "create order",
            CREATE_INTENRAL_ORDER,
            serde_json::json! ({
                "storeId": config.store_id,
                "input": {
                    "id": order_id,
                    "otherPartyId": config.supplying_name_id,
                    "maxMonthsOfStock": 1,
                    "minMonthsOfStock": 0
                }
            }),
            Some(token.clone()),
            "RequisitionNode",
        )
        .await?["requisitionNumber"]
        .as_u64()
        .unwrap();

    // SUPPLIER PROGRAM SETTINGS

    test.gql(
        "supplier program settgins",
        SUPPLIER_PROGRAM_SETTINGS,
        serde_json::json! ({
            "storeId": config.store_id,
        }),
        Some(token.clone()),
        "",
    )
    .await?;

    // GET INTERNAL ORDERS

    // This happens 2 time
    for i in 0..2 {
        test.gql(
            &format!("request orders {i}"),
            INTERNAL_ORDERS,
            serde_json::json! ({
            "storeId": config.store_id,
            "page": {
                "offset": 0,
                "first": 500
            },
            "sort": {
                "key": "createdDatetime",
                "desc": true
            },
            "filter": {
                "type": {
                "equalTo": "REQUEST"
                }
            }
            }),
            Some(token.clone()),
            "RequisitionConnector",
        )
        .await?;
    }

    // INTERNAL ORDER

    test.gql(
        "internal order",
        REQUEST_BY_NUMBER,
        serde_json::json! ({
            "storeId": config.store_id,
            "requisitionNumber": order_number
        }),
        Some(token.clone()),
        "RequisitionNode",
    )
    .await?;

    // REPORTS

    test.gql(
        "reports ",
        REPORTS,
        serde_json::json! ({
        "filter": {
            "subContext": {
            "equalAnyOrNull": []
            },
            "context": {
            "equalTo": "REQUISITION"
            }
        },
        "key": "name",
        "storeId": config.store_id
        }),
        Some(token.clone()),
        "ReportConnector",
    )
    .await?;

    // NAMES

    test.gql(
        &format!("names"),
        NAMES,
        serde_json::json! ({
        "key": "name",
        "desc": false,
        "storeId": config.store_id,
        "filter": {
            "isSupplier": true,
            "isStore": true
        },
        "first": 1000
        }),
        Some(token.clone()),
        "NameConnector",
    )
    .await?;

    // INTERNAL ORDER

    test.gql(
        "internal order",
        REQUEST_BY_NUMBER,
        serde_json::json! ({
            "storeId": config.store_id,
            "requisitionNumber": order_number
        }),
        Some(token.clone()),
        "RequisitionNode",
    )
    .await?;

    // MASTER_LISTS

    test.gql(
        "master lists",
        MASTER_LISTS,
        serde_json::json! ({
        "key": "description",
        "desc": false,
        "filter": {
            "isProgram": false,
            "existsForStoreId": {
            "equalTo": config.store_id
            }
        },
        "storeId": config.store_id
        }),
        Some(token.clone()),
        "MasterListConnector",
    )
    .await?;

    // ADD FROM MASTER LIST

    test.gql(
        "add from master list",
        ADD_FROM_MASTER_LIST,
        serde_json::json! ({
            "storeId": config.store_id,
            "requestId": order_id,
            "masterListId": config.master_list_id,
        }),
        Some(token.clone()),
        "RequisitionLineConnector",
    )
    .await?;

    // INTERNAL ORDER

    test.gql(
        "internal order",
        REQUEST_BY_NUMBER,
        serde_json::json! ({
            "storeId": config.store_id,
            "requisitionNumber": order_number
        }),
        Some(token.clone()),
        "RequisitionNode",
    )
    .await?;
    Ok(())
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct GraphQlResponse {
    data: Root,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct Root {
    root: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    url: String,
    username: String,
    password: String,
    store_id: String,
    supplying_name_id: String,
    master_list_id: String,
}

impl Config {
    fn gql_url(&self) -> anyhow::Result<Url> {
        let base_url = Url::parse(&self.url)
            .map_err(|err| anyhow::Error::msg(format!("Invalid base url: {}", err)))?;

        let url = base_url.join("graphql")?;

        Ok(url)
    }
}

#[derive(Debug)]
struct TaskError {
    task_number: u32,
    description: String,
    error: anyhow::Error,
}

struct GqlTest(Url, u32);

impl GqlTest {
    async fn gql(
        &self,
        description: &str,
        query: &str,
        variables: serde_json::Value,
        token: Option<String>,
        expected_typename: &str,
    ) -> Result<serde_json::Value, TaskError> {
        let start = SystemTime::now();

        let result = self._gql(query, variables, token, expected_typename).await;

        let end = SystemTime::now();
        let duration = end.duration_since(start).unwrap().as_millis();

        println!("{} - {description} - {duration}ms", self.1);

        result.map_err(|error| TaskError {
            task_number: self.1,
            description: description.to_string(),
            error,
        })
    }

    async fn _gql(
        &self,
        query: &str,
        variables: serde_json::Value,
        token: Option<String>,
        expected_typename: &str,
    ) -> anyhow::Result<serde_json::Value> {
        let body = serde_json::json!({
            "query": query,
            "variables": variables
        });

        let response = with_retries(
            (token, self.0.clone(), body),
            |client, (token, url, body)| async move {
                let mut client = client.post(url);
                if let Some(token) = token {
                    client = client.bearer_auth(token)
                };

                client.json(&body).send().await
            },
        )
        .await?;

        let status = response.status();
        let text_result = response.text().await?;

        let json_result: GraphQlResponse =
            match serde_json::from_str(&text_result).context(text_result) {
                Ok(res) => res,
                Err(err) => {
                    return Err(err.context(status));
                }
            };

        let result = json_result.data.root;

        if expected_typename.len() > 0 && result["__typename"] != expected_typename {
            anyhow::bail!(
                "Failed to validate typename {expected_typename} - {}",
                serde_json::to_string(&result).unwrap()
            );
        }

        Ok(result)
    }
}

async fn with_retries<F, Fut, D>(data: D, f: F) -> Result<Response, reqwest::Error>
where
    Fut: Future<Output = Result<Response, reqwest::Error>> + Send + 'static,
    F: Fn(Client, D) -> Fut,
    D: Clone,
{
    let mut max_retries = 10;
    let result = loop {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(1))
            .build()
            .unwrap();

        let result = f(client, data.clone()).await;

        let (status, is_connect_error) = match result.as_ref() {
            Ok(r) => (Some(r.status().clone()), false),
            Err(e) => (e.status().clone(), e.is_connect()),
        };

        if (is_connect_error || status == Some(StatusCode::REQUEST_TIMEOUT)) && max_retries > 0 {
            println!("waiting {}", max_retries);
            max_retries = max_retries - 1;
            continue;
        }

        break result;
    };

    result
}
