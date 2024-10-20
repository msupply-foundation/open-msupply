function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.items.nodes = processItemLines(res);
  Host.outputString(JSON.stringify(res));
}

const processItemLines = (res) => {
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
  let cleanNodes = cleanUpNodes(res.items.nodes);
  return cleanNodes;
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

const cleanUpNodes = (nodes) => {
  let cleanNodes = [];
  nodes.forEach((node) => {
    if (Object.keys(node).length != 0) {
      cleanNodes.push(cleanUpObject(node));
    }
  });
  return cleanNodes;
};

const cleanUpObject = (node) => {
  let newNode = {};
  // remove empty keys which will fail to parse
  Object.keys(node).forEach(function (key) {
    if (node[key] !== "" && node[key] !== undefined && node[key] !== null) {
      if (typeof node[key] === "object") {
        // recursively remove empty strings or undefined from graphql query
        newNode[key] = cleanUpObject(node[key]);
      } else {
        newNode[key] = node[key];
      }
    }
  });
  return newNode;
};

module.exports = {
  convert_data,
  calculateQuantity,
  calculateStatValue,
  processItemLines,
  cleanUpObject,
  cleanUpNodes,
};
