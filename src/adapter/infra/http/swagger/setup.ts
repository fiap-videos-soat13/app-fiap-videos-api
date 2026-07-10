import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { apiOpenApiDocument } from './openapi';

export function setupSwagger(app: Express): void {
  app.get('/api/docs.json', (_req, res) => {
    res.json(apiOpenApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(apiOpenApiDocument));
}
