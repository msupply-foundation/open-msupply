import {
  DateUtils,
  getAuthCookie,
  setAuthCookie,
  useGql,
} from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';

const ignoredQueries = ['refreshToken', 'syncInfo'];

const shouldIgnoreQuery = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (!operationNode) return false;
  if (operationNode.operation !== 'query') return false;

  return ignoredQueries.indexOf(operationNode.name?.value ?? '') !== -1;
};

export const useRefreshToken = () => {
  const { mutateAsync } = useGetRefreshToken();
  const { setHeader } = useGql();

  const refreshToken = (documentNode?: DocumentNode) => {
    if (!documentNode) return;

    // prevent an infinite loop - don't request a refresh token if we are currently requesting one
    if (documentNode.definitions.some(shouldIgnoreQuery)) return;

    const authCookie = getAuthCookie();
    // authCookie.expires reports as Date but is actually a string
    const expires = DateUtils.getDateOrNull(authCookie?.expires?.toString());

    const expiresIn = expires
      ? DateUtils.differenceInMinutes(expires, Date.now(), {
          roundingMethod: 'ceil',
        })
      : 0;

    if (expiresIn === 1) {
      mutateAsync().then(data => {
        const token = data?.token ?? '';
        const newCookie = { ...authCookie, token };
        setAuthCookie(newCookie);
        setHeader('Authorization', `Bearer ${token}`);
      });
    }
  };
  return { refreshToken };
};
