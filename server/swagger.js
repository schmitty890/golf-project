import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VOLW Firewood API',
      version: '1.0.0',
      description: 'API for VOLW Firewood — accounts, orders, and admin management',
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'User authentication endpoints',
      },
      {
        name: 'Orders',
        description: 'Firewood order endpoints',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
