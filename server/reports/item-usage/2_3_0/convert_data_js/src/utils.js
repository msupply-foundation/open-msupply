import { cleanUpNodes } from "../../../../utils";

const processItemLines = (res, sortBy) => {
  res.items.nodes.forEach((item) => {
    // don't add default values if empty object added
    if (Object.keys(item).length == 0) {
      return;
    }
    item.monthConsumption = calculateQuantity(
      res.thisMonthConsumption,
      item.id
    );
    item.lastMonthConsumption = calculateQuantity(
      res.lastMonthConsumption,
      item.id
    );
    item.twoMonthsAgoConsumption = calculateQuantity(
      res.twoMonthsAgoConsumption,
      item.id
    );
    item.expiringInSixMonths = calculateQuantity(
      res.expiringInSixMonths,
      item.id
    );
    item.expiringInTwelveMonths = calculateQuantity(
      res.expiringInTwelveMonths,
      item.id
    );
    item.stockOnOrder = calculateQuantity(res.stockOnOrder, item.id);
    item.AMC12 = calculateQuantity(res.AMCTwelve, item.id);
    item.AMC24 = calculateQuantity(res.AMCTwentyFour, item.id);
    item.SOH = calculateStatValue(item?.stats?.availableStockOnHand);
    item.MOS = calculateStatValue(item?.stats?.availableMonthsOfStockOnHand);
  });
  let sortedNodes = sortNodes(cleanNodes, sortBy);
  return sortedNodes;
};

// function adds month consumption to data  (either this or last month)
const calculateQuantity = (queryResult, id) => {
  let quantity = 0;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : 0;
  }
  return quantity;
};

const calculateStatValue = (value) => {
  let returnValue = 0;
  if (!!value) {
    // round to 1 decimal
    returnValue = Math.round(value * 10) / 10;
  }
  return returnValue;
};

function getNestedValue(node, key) {
  return key.split(".").reduce((value, part) => value && value[part], node);
}

const sortNodes = (nodes, sortBy) => {
  let { sort, dir } = sortBy ?? {};

  sort = sort ?? "expiryDate";
  dir = dir ?? "desc";
  nodes.sort((a, b) => {
    const valueA = getNestedValue(a, sort);
    const valueB = getNestedValue(b, sort);

    if (valueA === valueB) {
      return 0;
    }

    if (dir === "asc") {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  return nodes;
};

module.exports = {
  calculateQuantity,
  calculateStatValue,
  processItemLines,
  cleanUpNodes,
  sortNodes,
};
