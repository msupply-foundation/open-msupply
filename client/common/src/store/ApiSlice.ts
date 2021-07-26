import { createApi } from '@reduxjs/toolkit/query/react';
import { request } from 'graphql-request';

export const ApiSlice = createApi({
  baseQuery: ({ document, variables }) => {
    try {
      return { data: request('http://localhost:4000/graphql', document, variables) };
    } catch (error) {
      if (error) {
        return { error };
      }
      throw error;
    }
  },
  endpoints: () => ({}),
});
