import { mockAuthTokenQuery } from '@openmsupply-client/common/src/types/schema';

const mockAuthToken = mockAuthTokenQuery((req, res, ctx) => {
  const isValid = req.variables.password.startsWith('pass');

  return isValid
    ? res(
        ctx.data({
          authToken: { __typename: 'AuthToken', token: 'token-token-token' },
        })
      )
    : res(
        ctx.data({
          authToken: {
            __typename: 'AuthTokenError',
            error: {
              __typename: 'InvalidCredentials',
              description: 'Guess again!',
            },
          },
        })
      );
});

export const AuthHandlers = [mockAuthToken];
