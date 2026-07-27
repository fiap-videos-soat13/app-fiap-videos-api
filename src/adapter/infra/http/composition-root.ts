import { initializeInfrastructure } from "./initializers/initializeInfrastructure";
import { initializeRepositories } from "./initializers/initializeRepositories";
import { initializeUseCases } from "./initializers/initializeUseCases";
import { initializeMessaging } from "./initializers/initializeMessaging";
import { initializeControllers } from "./initializers/initializeControllers";
import { initializeExpress } from "./initializers/initializeExpress";
import { initializeInternalRoutes } from "./initializers/initializeInternalRoutes";
import { initializeDomainRoutes } from "./initializers/initializeDomainRoutes";
import { startOutboxRelay } from "./workers/startOutboxRelay";
import type { AppContext } from "./initializers/types";

export type { AppContext } from "./initializers/types";

export function buildApp(): AppContext {
  const infra = initializeInfrastructure();
  const repos = initializeRepositories();
  const useCases = initializeUseCases(repos, infra);
  const messaging = initializeMessaging(infra, useCases);
  const controllers = initializeControllers(useCases, infra);
  const app = initializeExpress(infra);

  initializeInternalRoutes(app, infra);
  initializeDomainRoutes(app, controllers);
  startOutboxRelay(messaging.outboxRelay);

  return {
    app,
    amqp: messaging.amqp,
    cache: infra.cache,
    startedSubscriber: messaging.startedSubscriber,
    completedSubscriber: messaging.completedSubscriber,
    failedSubscriber: messaging.failedSubscriber,
  };
}
