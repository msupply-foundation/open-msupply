const TestQueryResolvers = {
  error500: () => ({ data: [{ message: 'test', success: true }] }),
  error401: () => ({ data: [{ message: 'test', success: true }] }),
};

const TestTypes = `
    type Test {
        id: Int
        message: String
    }
    type TestResponse {
        data: [Test]
    }
  `;

const TestQueries = `
  error401: TestResponse
  error500: TestResponse
`;

export { TestQueries, TestQueryResolvers, TestTypes };
