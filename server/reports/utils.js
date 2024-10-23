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

const getNestedValue = (node, key) => {
  key = key + "";
  return key.split(".").reduce((value, part) => value && value[part], node);
};

const sortNodes = (nodes, sort, dir) => {
  if (!!sort) {
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
  }

  return nodes;
};

module.exports = {
  cleanUpObject,
  cleanUpNodes,
  getNestedValue,
  sortNodes,
};
