use super::definition::{DefaultQuery, GraphQlQuery};

pub fn get_default_gql_query(query: DefaultQuery) -> GraphQlQuery {
    match query {
        DefaultQuery::Invoice => GraphQlQuery {
            query: INVOICE_QUERY.to_string(),
            variables: None,
        },
        DefaultQuery::Stocktake => GraphQlQuery {
            query: STOCKTAKE_QUERY.to_string(),
            variables: None,
        },
        DefaultQuery::Requisition => GraphQlQuery {
            query: REQUISITION_QUERY.to_string(),
            variables: None,
        },
    }
}

const INVOICE_QUERY: &str = r#"
query InvoiceQuery($storeId: String, $dataId: String) {
  invoice(storeId: $storeId, id: $dataId) {
    ... on InvoiceNode {
      id
      allocatedDatetime
      colour
      comment
      createdDatetime
      deliveredDatetime
      invoiceNumber
      onHold
      otherPartyId
      otherPartyName
      pickedDatetime
      shippedDatetime
      status
      theirReference
      type
      verifiedDatetime
      pricing {
        serviceTotalAfterTax
        serviceTotalBeforeTax
        stockTotalAfterTax
        stockTotalBeforeTax
        taxPercentage
        totalAfterTax
        totalBeforeTax
      }
      otherParty(storeId: $storeId) {
        name
        isSupplier
        isCustomer
        id
        code
      }
      lines {
        nodes {
          batch
          costPricePerPack
          expiryDate
          invoiceId
          id
          itemCode
          itemId
          itemName
          locationId
          locationName
          note
          numberOfPacks
          packSize
          sellPricePerPack
          taxPercentage
          totalAfterTax
          totalBeforeTax
          type
          pricing {
            serviceTotalAfterTax
            serviceTotalBeforeTax
            stockTotalAfterTax
            stockTotalBeforeTax
            taxPercentage
            totalAfterTax
            totalBeforeTax
          }
          stockLine {
            availableNumberOfPacks
            batch
            costPricePerPack
            expiryDate
            id
            itemId
            locationId
            locationName
            note
            onHold
            packSize
            sellPricePerPack
            storeId
            totalNumberOfPacks
          }
        }
      }
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}
"#;

const STOCKTAKE_QUERY: &str = r#"query StocktakeQuery($storeId: String, $dataId: String) {
  stocktake(storeId: $storeId, id: $dataId) {
    ... on NodeError {
      __typename
      error {
        description
      }
    }
    ... on StocktakeNode {
      id
      storeId
      stocktakeNumber
      stocktakeDate
      status
      comment
      createdDatetime
      description
      finalisedDatetime
      inventoryAdjustmentId
      isLocked
      inventoryAdjustment {
        allocatedDatetime
        colour
        comment
        createdDatetime
        deliveredDatetime
        id
        invoiceNumber
        onHold
        otherPartyId
        otherPartyName
        pickedDatetime
        shippedDatetime
        status
        theirReference
        type
        verifiedDatetime
      }
      lines {
        totalCount
        nodes {
          batch
          comment
          costPricePerPack
          countedNumberOfPacks
          expiryDate
          id
          itemId
          note
          packSize
          sellPricePerPack
          snapshotNumberOfPacks
          stocktakeId
          item {
            name
            code
          }
          location {
            code
          }
        }
      }
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}"#;

const REQUISITION_QUERY: &str = r#"query RequisitionQuery($storeId: String, $dataId: String) {
  requisition(storeId: $storeId, id: $dataId) {
    ... on RequisitionNode {
      id
      colour
      comment
      createdDatetime
      finalisedDatetime
      maxMonthsOfStock
      minMonthsOfStock
      otherPartyId
      otherPartyName
      requisitionNumber
      sentDatetime
      status
      theirReference
      type
      shipments {
        totalCount
        nodes {
          allocatedDatetime
          colour
          comment
          createdDatetime
          deliveredDatetime
          id
          invoiceNumber
          onHold
          otherPartyId
          otherPartyName
          pickedDatetime
          shippedDatetime
          status
          theirReference
          type
          verifiedDatetime
        }
      }
      requestRequisition {
        colour
        comment
        createdDatetime
        finalisedDatetime
        id
        maxMonthsOfStock
        minMonthsOfStock
        otherPartyId
        otherPartyName
        requisitionNumber
        sentDatetime
        status
        theirReference
        type
        lines {
          totalCount
        }
      }
    }
    ... on RecordNotFound {
      __typename
      description
    }
  }
  store(id: $storeId) {
    ... on StoreNode {
      id
      name(storeId: $storeId) {
        address
        chargeCode
        code
        comment
        country
        email
        name
        phone
        website
      }
      code
      storeName
    }
    ... on NodeError {
      __typename
      error {
        description
      }
    }
  }
}"#;
