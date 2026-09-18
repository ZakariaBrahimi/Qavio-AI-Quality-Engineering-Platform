import { buildServer } from './server';

const port = Number(process.env.PORT ?? 4000);

buildServer()
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Qavio API listening on :${port}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
