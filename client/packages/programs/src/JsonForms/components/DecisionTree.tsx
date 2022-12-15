import React, { useEffect } from 'react';
import { rankWith, uiTypeIs, ControlProps } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, useZodOptionsValidation } from '../common';
import { z } from 'zod';
import { get as extractProperty } from 'lodash';
import { DocumentFragment, useEncounter, usePatient } from '../../api';

/** The condition that should be evaluated on the specified field */
type Condition = {
  equalTo?: string | number | boolean;
  greaterThan?: number;
};

type DecisionBranch = {
  /** If set apply condition on a field from the document data */
  dataField?: string;
  /** If set apply condition on a field from the patient document a*/
  patientField?: string;
  /** The id of the next tree node that should be checked if the condition evaluated to true */
  node: string;
} & Condition;

type DecisionNode = {
  /**
   * Defines the outcome of the decision tree if:
   * - there are no branches defined
   * - or if none of the branches matches
   */
  value?: string;
  /**
   * The branches going off from this node.
   * Branches are evaluated in order, i.e. first matching branch is followed.
   * */
  branches?: DecisionBranch[];
};

type DecisionTree = {
  /** The id of the root node */
  root: string;
  /** All nodes in the tree, nodes can refer other nodes int this record */
  nodes: Record<string, DecisionNode>;
};

type Options = {
  /**
   * The base path within the full data object.
   * Tree nodes refer to fields based on the basePath.
   */
  basePath?: string;
  tree: DecisionTree;
};

const Condition = z
  .object({
    equalTo: z.union([z.string(), z.number(), z.boolean()]).optional(),
    greaterThan: z.number().optional(),
  })
  .strict();

const DecisionBranch: z.ZodType<DecisionBranch> = Condition.extend({
  dataField: z.string().optional(),
  patientField: z.string().optional(),
  node: z.string(),
}).strict();

const DecisionNode = z
  .object({
    value: z.string().optional(),
    branches: z.array(DecisionBranch).optional(),
  })
  .strict();

const DecisionTree = z
  .object({
    root: z.string(),
    nodes: z.record(DecisionNode),
  })
  .strict();

const Options: z.ZodType<Options> = z
  .object({
    basePath: z.string().optional(),
    tree: DecisionTree,
  })
  .strict();

// Collect node parents and collect all roots and missing nodes while doing that
const prepareTreeValidation = (
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
const topologicalSort = (
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

const matchCondition = (
  branch: Condition,
  fieldData: string | number | boolean | undefined
): boolean => {
  if (!fieldData) {
    return false;
  }
  if (branch.equalTo !== undefined) {
    return branch.equalTo === fieldData;
  }
  if (branch.greaterThan !== undefined) {
    return branch.greaterThan < fieldData;
  }
  return false;
};

const getBranchField = (
  branch: DecisionBranch,
  data: Record<string, string | number | boolean | undefined> | undefined,
  patientDoc: DocumentFragment
): string | number | boolean | undefined => {
  if (branch.dataField) {
    return extractProperty(data, branch.dataField);
  }
  if (branch.patientField) {
    return extractProperty(patientDoc.data, branch.patientField);
  }

  return undefined;
};

const evaluateDecisionTree = (
  tree: DecisionTree,
  data: Record<string, string | number | boolean | undefined> | undefined,
  patientDoc: DocumentFragment
): string | undefined => {
  let current = tree.nodes[tree.root];
  if (!current) {
    return undefined;
  }
  // Used as a circuit breaker if nodes have been visited before which is not allowed
  const visitedNodes = new Set<string>();
  visitedNodes.add(tree.root);
  while (current) {
    let newCurrent = undefined;
    for (const branch of current.branches ?? []) {
      const field = getBranchField(branch, data, patientDoc);
      if (matchCondition(branch, field)) {
        if (visitedNodes.has(branch.node)) {
          console.error('Invalid tree with circular node connections');
          break;
        }
        visitedNodes.add(branch.node);

        newCurrent = tree.nodes[branch.node];
        break;
      }
    }
    // we reached the end of the tree return the current value
    if (!newCurrent) {
      return current.value;
    }
    current = newCurrent;
  }
};

const useTreeValidation = (
  errors: string | undefined,
  options: Options | undefined
): { errors?: string; options?: Options } => {
  if (errors || !options) {
    return { errors, options };
  }
  const validationData = prepareTreeValidation(options.tree.nodes);
  if (validationData.missingNodes.length > 0) {
    return { errors: `Missing tree nodes: ${validationData.missingNodes}` };
  }
  if (validationData.roots.length === 0) {
    return { errors: `No tree root found (circular dependency to root?)` };
  }
  if (validationData.roots.length > 1) {
    return { errors: `Tree has multiple roots: ${validationData.roots}` };
  }
  if (validationData.roots[0] !== options.tree.root) {
    return {
      errors: `Invalid root: ${validationData.roots[0]} but ${options.tree.root} expected`,
    };
  }

  /** Do a topological sort to detect circular dependencies */
  const { errorNodes } = topologicalSort(
    options.tree.root,
    options.tree.nodes,
    validationData.parents
  );
  if (errorNodes) {
    return {
      errors: `Circular dependency detected for node(s): ${errorNodes}`,
    };
  }

  return { options };
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, visible, uischema, path } = props;
  const { errors: zodErrors, options: zodOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { errors, options } = useTreeValidation(zodErrors, zodOptions);

  const { core } = useJsonForms();

  // get patient data assuming we are in an encounter...
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);
  const { data: patientDoc } = usePatient.get.patientDocument(
    currentEncounter?.patient.id
  );

  useEffect(() => {
    if (!options || !core?.data || !patientDoc) {
      return;
    }

    const basePath = options.basePath ?? '';
    const baseData = extractProperty(core.data, basePath);
    const value = evaluateDecisionTree(options.tree, baseData, patientDoc);
    if (value !== data) {
      handleChange(path, value);
    }
  }, [options, core?.data, patientDoc]);

  if (!visible) {
    return null;
  }
  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: data ?? '',
        sx: { margin: 0.5, width: '100%' },
        disabled: true,
        helperText: errors,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  );
};

export const decisionTreeTester = rankWith(10, uiTypeIs('DecisionTree'));
export const DecisionTreeControl = withJsonFormsControlProps(UIComponent);
