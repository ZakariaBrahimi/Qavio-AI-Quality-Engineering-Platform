import { createFixtureServer } from './server';

const port = Number(process.env.PORT ?? 4310);

createFixtureServer().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`QA fixture app listening on http://localhost:${port}`);
});
