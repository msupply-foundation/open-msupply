import { DecisionNode } from './DecisionTree';

// Collect node parents and collect all roots and missing nodes while doing that
export const prepareTreeValidation = (
  nodes: Record<string, DecisionNode>
): {
  roots: string[];
  parents: Record<string, string[]>;
  missingNodes: string[];
} => {
  const parents: Record<string, string[]> = {};
  const missingNodes = [];
  for (const key of Object.keys(nodes)) {
    const node = nodes[key];
    if (!node) {
      continue;
    }
    // init the parents list for the current node (in case its a root node)
    if (!parents[key]) {
      parents[key] = [];
    }
    for (const child of node.branches ?? []) {
      if (!child.node) {
        continue;
      }
      if (nodes[child.node] === undefined) {
        missingNodes.push(child.node);
        continue;
      }
      const childParents = parents[child.node] ?? [];
      if (!childParents.includes(key)) {
        childParents.push(key);
      }
      parents[child.node] = childParents;
    }
  }

  const roots = Object.entries(parents)
    .filter(([, nodeParents]) => nodeParents.length === 0)
    .map(([key]) => key);
  return { roots, parents, missingNodes };
};

// Topologically sort the tree and return an error node if there is a circular dependency
export const topologicalSort = (
  root: string,
  nodes: Record<string, DecisionNode>,
  parents: Record<string, string[]>
): { sortedNodes: string[]; errorNodes?: string[] } => {
  // We do a topological sort and clear all parents entries along the way.
  // If there are parents left we have a circular dependency and the sort didn't finish.

  // Clear root entry from the parent list because they shouldn't have any parents.
  delete parents[root];

  const sortedNodes: string[] = [];
  // new items are added to the front
  const queue = [root];
  while (queue.length > 0) {
    const currentId = queue.pop() ?? '';
    const current = nodes[currentId];
    if (!current) {
      throw Error('Unexpected');
    }
    // add to sorted list
    sortedNodes.push(currentId);
    for (const child of current.branches ?? []) {
      if (!child.node) {
        continue;
      }
      // remove current parent from the child parents, also remove ourself if there is a direct
      // circular dependency
      const childParents =
        parents[child.node]?.filter(
          it => it !== currentId && it !== child.node
        ) ?? [];
      if (childParents.length === 0) {
        if (sortedNodes.includes(child.node)) {
          // should not happen?
          return { sortedNodes: [], errorNodes: [child.node] };
        }
        // add child to the front of the queue
        queue.unshift(child.node);
        delete parents[child.node];
      } else {
        parents[child.node] = childParents;
      }
    }
  }
  if (Object.keys(parents).length !== 0) {
    return { sortedNodes: [], errorNodes: Object.keys(parents) };
  }
  return { sortedNodes };
};
