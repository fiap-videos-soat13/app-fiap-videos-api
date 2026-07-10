export const apiOpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'FIAP Videos API',
    description:
      'Microsserviço de borda: autenticação, upload de vídeo, listagem de status e download do zip.',
    version: '0.1.0',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  tags: [
    { name: 'Auth', description: 'Registro e login (JWT)' },
    { name: 'Videos', description: 'Upload, status e download' },
    { name: 'Health', description: 'Probes e métricas' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'demo@fiap.com' },
          password: { type: 'string', minLength: 8, example: 'senha1234' },
        },
        example: { email: 'demo@fiap.com', password: 'senha1234' },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'demo@fiap.com' },
          password: { type: 'string', example: 'senha1234' },
        },
        example: { email: 'demo@fiap.com', password: 'senha1234' },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string' },
            },
          },
        },
      },
      VideoJobSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
          originalFileName: { type: 'string' },
          errorMessage: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar usuário',
        description:
          'Crie o usuário antes do login. Se o e-mail já existir, use POST /auth/login com a mesma senha.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: { email: 'demo@fiap.com', password: 'senha1234' },
            },
          },
        },
        responses: {
          '201': { description: 'Usuário criado' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description:
          'Requer usuário já registrado em POST /auth/register. E-mail ou senha incorretos retornam 401.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { email: 'demo@fiap.com', password: 'senha1234' },
            },
          },
        },
        responses: {
          '200': {
            description: 'JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
        },
      },
    },
    '/videos': {
      get: {
        tags: ['Videos'],
        security: [{ bearerAuth: [] }],
        summary: 'Listar vídeos do usuário',
        responses: {
          '200': {
            description: 'Lista de jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VideoJobSummary' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Videos'],
        security: [{ bearerAuth: [] }],
        summary: 'Enviar vídeo para processamento',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['video'],
                properties: {
                  video: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '202': { description: 'Job aceito (pending)' },
        },
      },
    },
    '/videos/{id}': {
      get: {
        tags: ['Videos'],
        security: [{ bearerAuth: [] }],
        summary: 'Status de um job de vídeo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhe do job',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VideoJobSummary' },
              },
            },
          },
          '404': { description: 'Job não encontrado' },
        },
      },
    },
    '/videos/{id}/download': {
      get: {
        tags: ['Videos'],
        security: [{ bearerAuth: [] }],
        summary: 'Download do zip de frames',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'application/zip',
            content: {
              'application/zip': { schema: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness (Postgres)',
        responses: {
          '200': { description: 'DB up' },
          '503': { description: 'DB down' },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        responses: { '200': { description: 'text/plain metrics' } },
      },
    },
  },
} as const;
