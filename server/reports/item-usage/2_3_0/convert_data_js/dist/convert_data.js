var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../utils.js
var require_utils = __commonJS({
  "../../../utils.js"(exports2, module2) {
    var cleanUpNodes = (nodes) => {
      let cleanNodes = [];
      nodes.forEach((node) => {
        if (Object.keys(node).length != 0) {
          cleanNodes.push(cleanUpObject(node));
        }
      });
      return cleanNodes;
    };
    var cleanUpObject = (node) => {
      let newNode = {};
      Object.keys(node).forEach(function(key) {
        if (node[key] !== "" && node[key] !== void 0 && node[key] !== null) {
          if (typeof node[key] === "object") {
            newNode[key] = cleanUpObject(node[key]);
          } else {
            newNode[key] = node[key];
          }
        }
      });
      return newNode;
    };
    module2.exports = {
      cleanUpObject,
      cleanUpNodes
    };
  }
});

// src/utils.js
var require_utils2 = __commonJS({
  "src/utils.js"(exports2, module2) {
    var import_utils2 = __toESM(require_utils());
    var processItemLines2 = (res) => {
      res.items.nodes.forEach((item) => {
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
      let cleanNodes = (0, import_utils2.cleanUpNodes)(res.items.nodes);
      return cleanNodes;
    };
    var calculateQuantity = (queryResult, id) => {
      let quantity = 0;
      if (!!queryResult && !!id) {
        const node = queryResult.find((element) => element.item_id == id);
        quantity = node?.quantity ? node.quantity : 0;
      }
      return quantity;
    };
    var calculateStatValue = (value) => {
      let returnValue = 0;
      if (!!value) {
        returnValue = Math.round(value * 10) / 10;
      }
      return returnValue;
    };
    module2.exports = {
      calculateQuantity,
      calculateStatValue,
      processItemLines: processItemLines2,
      cleanUpNodes: import_utils2.cleanUpNodes
    };
  }
});

// src/convert_data.js
var import_utils = __toESM(require_utils2());
function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.data.items.nodes = (0, import_utils.processItemLines)(res.data);
  Host.outputString(JSON.stringify(res));
}
module.exports = {
  convert_data
};
//# sourceMappingURL=convert_data.js.map
