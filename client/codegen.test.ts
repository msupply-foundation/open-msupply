import { spawnSync } from 'child_process';
describe('Validate GraphQL schema generation', () => {
  it('should generate the GraphQL schema without errors', () => {
    const result = spawnSync('yarn', ['generate'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });
    expect(result.status).toBe(0);
  });
});
