import 'dotenv/config';
import { buildApp } from './composition-root';
import {
  runMigrations,
  initializeConnection,
  closeDb,
  getDb,
} from '@adapter/infra/database/client';
import { bootstrapUsers } from '@adapter/infra/database/bootstrapUsers';

async function bootstrap(): Promise<void> {
  await runMigrations();
  await initializeConnection();

  if (process.env.BOOTSTRAP_USERS === 'true') {
    const includeDemoUser = process.env.NODE_ENV !== 'production';
    await bootstrapUsers(getDb(), { includeDemoUser });
  }

  const {
    app,
    amqp,
    cache,
    startedSubscriber,
    completedSubscriber,
    failedSubscriber,
  } = buildApp();
  await amqp.connect();
  await startedSubscriber.start();
  await completedSubscriber.start();
  await failedSubscriber.start();

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST?.trim() || '0.0.0.0';

  const server = app.listen(port, host, () => {
    console.log(`API FIAP Videos rodando em http://${host}:${port}`);
    console.log(`Swagger em http://${host}:${port}/api/docs`);
    console.log(`Login em http://${host}:${port}/login`);
    console.log(`Status em http://${host}:${port}/status`);
  });

  const shutdown = async (): Promise<void> => {
    await startedSubscriber.stop();
    await completedSubscriber.stop();
    await failedSubscriber.stop();
    server.close();
    await amqp.close();
    await cache.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
