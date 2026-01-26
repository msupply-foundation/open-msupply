import orderBy from 'lodash/orderBy';
import get from 'lodash/get';

export const sortNodes = (nodes, sort, dir) => {
  if (!!sort) {
    return orderBy(
      nodes,
      [
        node => {
          const value = get(node, sort);
          return typeof value === 'string' ? value.toLowerCase() : value;
        },
      ],
      [dir || 'asc']
    );
  }
  return nodes;
};
