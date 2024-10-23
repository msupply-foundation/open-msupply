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
    var processStockLines2 = (nodes, sort, dir) => {
      nodes.forEach((line) => {
        if (Object.keys(line).length == 0) {
          return;
        }
        const daysUntilExpiredFloat = calculateDaysUntilExpired(line?.expiryDate);
        const expectedUsage = calculateExpectedUsage(
          daysUntilExpiredFloat,
          line?.item?.stats?.averageMonthlyConsumption
        );
        if (!!expectedUsage) {
          line.expectedUsage = expectedUsage;
        }
        const stockAtRisk = calculateStockAtRisk(
          line?.packSize,
          line?.totalNumberOfPacks,
          line?.item?.stats?.averageMonthlyConsumption,
          daysUntilExpiredFloat
        );
        if (!!stockAtRisk) {
          line.stockAtRisk = stockAtRisk;
        }
        line.daysUntilExpired = roundDaysToInteger(daysUntilExpiredFloat);
      });
      let cleanNodes = (0, import_utils2.cleanUpNodes)(nodes);
      let sortedNodes = sortNodes(cleanNodes, sort, dir);
      return sortedNodes;
    };
    var calculateDaysUntilExpired = (expiryDateString) => {
      let daysUntilExpired = void 0;
      if (!!expiryDateString) {
        let now = Date.now();
        daysUntilExpired = (new Date(expiryDateString) - now) / 1e3 / 60 / 60 / 24;
      }
      return daysUntilExpired;
    };
    var calculateExpectedUsage = (daysUntilExpired, averageMonthlyConsumption) => {
      let expectedUsage = void 0;
      if (!!daysUntilExpired && !!averageMonthlyConsumption) {
        if (daysUntilExpired >= 0) {
          expectedUsage = Math.round(
            daysUntilExpired * (averageMonthlyConsumption / 30)
          );
        }
      }
      return expectedUsage;
    };
    var calculateStockAtRisk = (packSize, totalNumberOfPacks, averageMonthlyConsumption, daysUntilExpired) => {
      let stockAtRisk = void 0;
      if (!!packSize && !!totalNumberOfPacks && !!daysUntilExpired) {
        const totalStock = packSize * totalNumberOfPacks;
        if (!!averageMonthlyConsumption) {
          if (daysUntilExpired >= 0) {
            stockAtRisk = Math.round(
              totalStock - averageMonthlyConsumption * (daysUntilExpired / 30)
            );
          } else {
            stockAtRisk = Math.round(totalStock);
          }
        }
        if (!averageMonthlyConsumption) {
          if (daysUntilExpired <= 0) {
            stockAtRisk = Math.round(totalStock);
          }
        }
      }
      return stockAtRisk;
    };
    var roundDaysToInteger = (daysUntilExpired) => {
      let rounded = void 0;
      if (!!daysUntilExpired) {
        rounded = Math.round(daysUntilExpired);
      }
      return rounded;
    };
    function getNestedValue(node, key) {
      key = key + "";
      return key.split(".").reduce((value, part) => value && value[part], node);
    }
    var sortNodes = (nodes, sort, dir) => {
      sort = sort ?? "expiryDate";
      dir = dir ?? "desc";
      console.log("sort inside sort function", sort, dir);
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
    module2.exports = {
      calculateExpectedUsage,
      processStockLines: processStockLines2,
      calculateDaysUntilExpired,
      calculateStockAtRisk,
      roundDaysToInteger,
      sortNodes,
      getNestedValue
    };
  }
});

// src/convert_data.js
var import_utils = __toESM(require_utils2());
function convert_data() {
  let res = JSON.parse(Host.inputString());
  console.log("convert data sort", res?.arguments?.sort, res?.arguments?.dir);
  res.data.stockLines.nodes = (0, import_utils.processStockLines)(
    res.data.stockLines.nodes,
    res?.arguments?.sort ?? void 0,
    res?.arguments?.dir ?? void 0
  );
  Host.outputString(JSON.stringify(res));
}
module.exports = {
  convert_data
};
//# sourceMappingURL=convert_data.js.map
