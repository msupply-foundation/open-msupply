import { gql } from "@apollo/client";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const AUTH_TOKEN = gql`
  query AuthToken(
    $username: String!
    $password: String!
  ) {
    authToken(username: $username, password: $password) {
      ... on AuthToken {
        token
      }
      ... on AuthTokenError {
        error {
          __typename
          description
          ... on AccountBlocked {
            timeoutRemaining
          }
        }
      }
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken {
    refreshToken {
      ... on RefreshToken {
        token
      }
      ... on RefreshTokenError {
        error {
          description
        }
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      ... on UserNode {
        username
        stores {
          nodes {
            id
            code
            name
          }
        }
      }
    }
  }
`;

// ─── Patients ─────────────────────────────────────────────────────────────────

export const PATIENTS_BY_CODE = gql`
  query PatientsByCode($storeId: String!, $code: String!) {
    patients(storeId: $storeId, filter: { code: { like: $code } }) {
      ... on PatientConnector {
        nodes {
          id
          name
          code
          firstName
          lastName
        }
      }
    }
  }
`;

// ─── Barcode ─────────────────────────────────────────────────────────────────

export const BARCODE_BY_GTIN = gql`
  query BarcodeByGtin($storeId: String!, $gtin: String!) {
    barcodeByGtin(storeId: $storeId, gtin: $gtin) {
      ... on BarcodeNode {
        id
        gtin
        itemId
      }
    }
  }
`;

// ─── Items ───────────────────────────────────────────────────────────────────

export const ITEM_BY_ID = gql`
  query ItemById($storeId: String!, $itemId: String!) {
    items(storeId: $storeId, filter: { id: { equalTo: $itemId } }) {
      ... on ItemConnector {
        nodes {
          id
          name
          code
        }
      }
    }
  }
`;

export const ITEMS_SEARCH = gql`
  query ItemsSearch($storeId: String!, $search: String!) {
    items(
      storeId: $storeId
      filter: { codeOrName: { like: $search } }
      page: { first: 20 }
    ) {
      ... on ItemConnector {
        nodes {
          id
          name
          code
        }
      }
    }
  }
`;

// ─── Prescription (Issue) ────────────────────────────────────────────────────

export const INSERT_PRESCRIPTION = gql`
  mutation InsertPrescription(
    $storeId: String!
    $id: String!
    $patientId: String!
  ) {
    insertPrescription(
      storeId: $storeId
      input: { id: $id, patientId: $patientId }
    ) {
      ... on InvoiceNode {
        id
        invoiceNumber
      }
    }
  }
`;

export const UPDATE_PRESCRIPTION = gql`
  mutation UpdatePrescription(
    $storeId: String!
    $input: UpdatePrescriptionInput!
  ) {
    updatePrescription(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        id
        status
      }
    }
  }
`;

export const SAVE_PRESCRIPTION_ITEM_LINES = gql`
  mutation SavePrescriptionItemLines(
    $storeId: String!
    $input: SavePrescriptionLinesInput!
  ) {
    savePrescriptionItemLines(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        id
        invoiceNumber
      }
    }
  }
`;

export const STOCK_LINES_FOR_ITEM = gql`
  query StockLinesForItem($storeId: String!, $itemId: String!) {
    stockLines(
      storeId: $storeId
      filter: { itemId: { equalTo: $itemId }, isAvailable: true }
      sort: { key: expiryDate, desc: false }
    ) {
      ... on StockLineConnector {
        totalCount
        nodes {
          id
          itemId
          batch
          packSize
          availableNumberOfPacks
          expiryDate
        }
      }
    }
  }
`;

// ─── Inbound Shipment (Receive) ──────────────────────────────────────────────

export const INBOUND_SHIPMENTS = gql`
  query InboundShipments($storeId: String!) {
    invoices(
      storeId: $storeId
      filter: {
        type: { equalTo: INBOUND_SHIPMENT }
        status: { equalTo: SHIPPED }
      }
    ) {
      ... on InvoiceConnector {
        nodes {
          id
          invoiceNumber
          otherPartyName
          status
          createdDatetime
          theirReference
          lines {
            nodes {
              id
              itemName
              itemId
              numberOfPacks
            }
          }
        }
      }
    }
  }
`;

export const INBOUND_SHIPMENT_DETAIL = gql`
  query InboundShipmentDetail($storeId: String!, $id: String!) {
    invoice(storeId: $storeId, id: $id) {
      ... on InvoiceNode {
        id
        invoiceNumber
        otherPartyName
        status
        theirReference
        lines {
          nodes {
            id
            itemName
            itemId
            numberOfPacks
          }
        }
      }
    }
  }
`;

export const UPDATE_INBOUND_SHIPMENT = gql`
  mutation UpdateInboundShipment(
    $storeId: String!
    $input: UpdateInboundShipmentInput!
  ) {
    updateInboundShipment(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        id
        status
      }
    }
  }
`;

export const UPDATE_INBOUND_LINE = gql`
  mutation UpdateInboundLine(
    $storeId: String!
    $input: UpdateInboundShipmentLineInput!
  ) {
    updateInboundShipmentLine(storeId: $storeId, input: $input) {
      ... on InvoiceLineNode {
        id
        numberOfPacks
      }
    }
  }
`;

// ─── Stocktake ───────────────────────────────────────────────────────────────

export const STOCKTAKES = gql`
  query Stocktakes($storeId: String!) {
    stocktakes(storeId: $storeId, filter: { status: { equalTo: NEW } }) {
      ... on StocktakeConnector {
        totalCount
        nodes {
          id
          stocktakeNumber
          status
          createdDatetime
          description
          comment
        }
      }
    }
  }
`;

export const INSERT_STOCKTAKE = gql`
  mutation InsertStocktake($storeId: String!, $id: String!) {
    insertStocktake(
      storeId: $storeId
      input: { id: $id, isAllItemsStocktake: true }
    ) {
      ... on StocktakeNode {
        id
      }
    }
  }
`;

export const STOCKTAKE_LINES = gql`
  query StocktakeLines($storeId: String!, $stocktakeId: String!) {
    stocktakeLines(
      storeId: $storeId
      stocktakeId: $stocktakeId
      page: { first: 10000 }
    ) {
      ... on StocktakeLineConnector {
        totalCount
        nodes {
          id
          itemId
          itemName
          snapshotNumberOfPacks
          countedNumberOfPacks
          batch
          expiryDate
          item {
            id
            unitName
          }
        }
      }
    }
  }
`;

export const UPDATE_STOCKTAKE_LINE = gql`
  mutation UpdateStocktakeLine(
    $storeId: String!
    $input: UpdateStocktakeLineInput!
  ) {
    updateStocktakeLine(storeId: $storeId, input: $input) {
      ... on StocktakeLineNode {
        id
        countedNumberOfPacks
      }
    }
  }
`;

export const FINALISE_STOCKTAKE = gql`
  mutation FinaliseStocktake(
    $storeId: String!
    $input: UpdateStocktakeInput!
  ) {
    updateStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode {
        id
        status
      }
    }
  }
`;
