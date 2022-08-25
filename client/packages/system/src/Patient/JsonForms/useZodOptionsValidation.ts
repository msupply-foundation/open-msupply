import { useEffect, useState } from 'react';
import { z, ZodError, ZodIssue, ZodIssueCode } from 'zod';

const formatMessage = (issue: ZodIssue): string => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type: {
      return `${issue.expected} ${issue.message}`;
    }
    case ZodIssueCode.invalid_union: {
      const messages = issue.unionErrors.map(it => {
        const issue = it.issues[0];
        return !issue ? '' : formatMessage(issue);
      });
      return `${messages.join(' OR ')}`;
    }
  }
  return issue.message;
};

const formatIssue = (objectVarName: string, issue: ZodIssue): string => {
  const path = issue.path
    .map((part, i) => {
      if (typeof part === 'number') {
        return `[${part}]`;
      }
      if (i === 0) return part;
      return `.${part}`;
    })
    .join('');
  const message = formatMessage(issue);
  return `\"${objectVarName}.${path}\" => ${message}`;
};

const formatError = (objectVarName: string, error: ZodError): string => {
  return `${error.issues.map(it => formatIssue(objectVarName, it)).join(', ')}`;
};

export const useZodOptionsValidation = <T>(
  TypeDef: z.ZodType<T, z.ZodTypeDef, T>,
  options?: Record<string, unknown>
): { errors?: string; options?: T } => {
  const [errors, setErrors] = useState<string | undefined>();
  const [parsedOptions, setOptions] = useState<T | undefined>();
  useEffect(() => {
    if (!options) {
      setErrors('Bad control config: options are required');
      return;
    }

    const result = TypeDef.safeParse(options);
    if (result.success) {
      setOptions(result.data);
    } else {
      // It gets very messy showing more than one issue...
      setErrors(`Bad control config: ${formatError('options', result.error)}`);
    }
  }, [options]);
  return { errors, options: parsedOptions };
};
