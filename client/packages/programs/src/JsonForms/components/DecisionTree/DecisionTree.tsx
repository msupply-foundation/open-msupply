import React, { useEffect } from 'react';
import { rankWith, uiTypeIs, ControlProps } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, useZodOptionsValidation } from '../../common';
import { z } from 'zod';
import { extractProperty } from '@common/utils';
import { useEncounter } from '../../../api';
import { useDecisionTreeValidation } from './useDecisionTreeValidation';
import { usePatient, PatientRowFragment } from '@openmsupply-client/system';

/** The condition that should be evaluated on the specified field */
export type Condition = {
  equalTo?: string | number | boolean;
  greaterThan?: number;
  lessThanOrEqualTo?: number;
};

export type DecisionBranch = {
  /** If set, apply condition on a field from the document data */
  dataField?: string;
  /**
   * If set, apply condition on a field from the patient node as returned by the patient GraphQl
   * endpoint
   */
  patientField?: string;
  /** The id of the next tree node that should be checked if the condition evaluates to true */
  node?: string;
  /**
   * The result value of the tree when the condition evaluates to true.
   * This can be used to avoid a value only leaf node, i.e. make the config less verbose.
   */
  value?: string;
} & Condition;

export type DecisionNode = {
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

export type DecisionTree = {
  /** The id of the root node */
  root: string;
  /** All nodes in the tree, nodes can refer other nodes int this record */
  nodes: Record<string, DecisionNode>;
};

export type Options = {
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
    lessThanOrEqualTo: z.number().optional(),
  })
  .strict();

const DecisionBranch: z.ZodType<DecisionBranch> = Condition.extend({
  dataField: z.string().optional(),
  patientField: z.string().optional(),
  node: z.string().optional(),
  value: z.string().optional(),
})
  .strict()
  .refine(
    data => !!data.node || data.value !== undefined,
    'Either a node or a value must be specified.'
  );

const DecisionNode: z.ZodType<DecisionNode> = z
  .object({
    value: z.string().optional(),
    branches: z.array(DecisionBranch).optional(),
  })
  .strict()
  .refine(
    data => data.branches || data.value !== undefined,
    'Either a value or branches must be specified.'
  );

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
  if (branch.greaterThan !== undefined && typeof fieldData === 'number') {
    return branch.greaterThan < fieldData;
  }
  if (branch.lessThanOrEqualTo !== undefined && typeof fieldData === 'number') {
    return branch.lessThanOrEqualTo >= fieldData;
  }
  return false;
};

const getBranchField = (
  branch: DecisionBranch,
  data: Record<string, string | number | boolean | undefined> | undefined,
  patientNode: PatientRowFragment
): string | number | boolean | undefined => {
  if (branch.dataField) {
    return extractProperty(data, branch.dataField);
  }
  if (branch.patientField) {
    return extractProperty(patientNode, branch.patientField);
  }

  return undefined;
};

const evaluateDecisionTree = (
  tree: DecisionTree,
  data: Record<string, string | number | boolean | undefined> | undefined,
  patientNode: PatientRowFragment
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
      const field = getBranchField(branch, data, patientNode);
      if (matchCondition(branch, field)) {
        if (branch.value !== undefined) {
          return branch.value;
        }
        if (!branch.node) {
          console.error(
            'Invalid tree config either value or node must be specified (should have been validated by zod)'
          );
          break;
        }
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

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, visible, uischema, path } = props;
  const { errors: zodErrors, options: zodOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { errors, options } = useDecisionTreeValidation(zodErrors, zodOptions);

  const { core } = useJsonForms();

  // get patient data assuming we are in an encounter...
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);
  const { data: patientNode } = usePatient.document.get(
    currentEncounter?.patient.id
  );

  useEffect(() => {
    if (!options || !core?.data || !patientNode) {
      return;
    }

    const basePath = options.basePath ?? '';
    const baseData = extractProperty(core.data, basePath);
    const value = evaluateDecisionTree(options.tree, baseData, patientNode);
    if (value !== data) {
      handleChange(path, value);
    }
  }, [options, core?.data, patientNode, data, handleChange, path]);

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
