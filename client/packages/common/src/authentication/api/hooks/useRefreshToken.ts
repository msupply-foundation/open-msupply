import {
  DateUtils,
  getAuthCookie,
  setAuthCookie,
} from '@openmsupply-client/common';
import { useGetRefreshToken } from './useGetRefreshToken';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';

const isRefreshRequest = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (!operationNode) return false;
  if (operationNode.operation !== 'query') return false;

  return operationNode.name?.value === 'refreshToken';
};

export const useRefreshToken = () => {
  const { mutateAsync } = useGetRefreshToken();

  const refreshToken = (documentNode?: DocumentNode) => {
    if (!documentNode) return;

    // prevent an infinite loop - don't request a refresh token if we are currently requesting one
    if (documentNode.definitions.some(isRefreshRequest)) return;

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
        const newCookie = { ...authCookie, token: data?.token ?? '' };
        setAuthCookie(newCookie);
      });
    }
  };
  return { refreshToken };
};
