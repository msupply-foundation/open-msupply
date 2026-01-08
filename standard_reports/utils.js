const getNestedValue = (node, key) => {
  key = key + '';
  return key.split('.').reduce((value, part) => value && value[part], node);
};

const sortNodes = (nodes, sort, dir) => {
  if (!!sort) {
    nodes.sort((a, b) => {
      let valueA = getNestedValue(a, sort);

      if (typeof valueA == 'string') {
        valueA = valueA.toLocaleLowerCase();
      }

      let valueB = getNestedValue(b, sort);
      if (typeof valueB == 'string') {
        valueB = valueB.toLocaleLowerCase();
      }

      if (valueA == null && valueB == null) {
        return 0;
      }

      if (valueA == null) {
        return dir === 'asc' ? -1 : 1;
      }

      if (valueB == null) {
        return dir === 'asc' ? 1 : -1;
      }

      if (valueA === valueB) {
        return 0;
      }

      if (dir === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  return nodes;
};

module.exports = {
  getNestedValue,
  sortNodes,
};
