# Task Management System - Backend Services

## Overview

Enterprise-grade microservices backend for the Task Management System, built with Node.js 20+ and TypeScript 5.0+. The system provides robust task and project management capabilities through a scalable, containerized architecture.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker >= 24.0.0
- Docker Compose >= 2.20.0
- Kubernetes >= 1.27.0
- Helm >= 3.12.0

## Technology Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.0+
- **Framework**: Express 4.x
- **Database**: PostgreSQL 15.x
- **Cache**: Redis 7.x
- **Message Queue**: RabbitMQ 3.12.x
- **ORM**: Prisma 5.x
- **Testing**: Jest 29.x
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker/Kubernetes
- **CI/CD**: GitHub Actions

## Project Structure

```
src/backend/
├── api-gateway/          # API Gateway service
├── auth-service/         # Authentication service
├── task-service/        # Task management service
├── project-service/     # Project management service
├── notification-service/ # Real-time notification service
├── file-service/        # File management service
├── shared/              # Shared utilities and middleware
├── docker-compose.yml   # Local development container config
├── package.json         # Project dependencies and scripts
└── README.md           # Project documentation
```

## Services Architecture

| Service | Port | Description | Dependencies |
|---------|------|-------------|--------------|
| API Gateway | 3000 | Request routing and API management | Auth, all services |
| Auth Service | 3001 | Authentication and authorization | PostgreSQL, Redis |
| Task Service | 3002 | Task management operations | PostgreSQL, RabbitMQ |
| Project Service | 3003 | Project management operations | PostgreSQL, RabbitMQ |
| Notification Service | 3004 | Real-time notifications | RabbitMQ, Redis |
| File Service | 3005 | File upload and management | Local storage/S3 |

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/organization/task-management-system.git
cd task-management-system/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development environment:
```bash
npm run docker:compose
```

## Development

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format
```

### Database Operations
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### Docker Operations
```bash
# Build services
npm run docker:build

# Start all services
npm run docker:compose

# Stop all services
npm run docker:compose:down
```

## Testing

```bash
# Run unit tests
npm run test

# Run tests with watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## API Documentation

API documentation is available through Swagger UI at:
- Development: http://localhost:3000/api-docs
- Staging: https://staging-api.domain.com/api-docs
- Production: https://api.domain.com/api-docs

## Deployment

### Production Requirements
- Kubernetes cluster 1.27+
- Helm 3.12+
- Valid SSL certificates
- Configured cloud storage
- Monitoring stack (Prometheus/Grafana)

### Deployment Process
1. Build and push Docker images
2. Update Kubernetes manifests
3. Deploy using Helm charts
4. Verify health checks
5. Monitor service metrics

## Environment Variables

| Variable | Description | Default | Required | Environment |
|----------|-------------|---------|----------|-------------|
| NODE_ENV | Environment name | development | Yes | All |
| PORT | Service port | 3000 | Yes | All |
| DATABASE_URL | PostgreSQL connection | - | Yes | All |
| REDIS_URL | Redis connection | - | Yes | All |
| RABBITMQ_URL | RabbitMQ connection | - | Yes | All |
| JWT_SECRET | JWT signing key | - | Yes | All |
| AWS_REGION | AWS region | - | Production | Production |
| AWS_BUCKET | S3 bucket name | - | Production | Production |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

### Code Standards
- Follow TypeScript best practices
- Maintain 100% test coverage
- Document all public APIs
- Follow conventional commits

## License

MIT License - see LICENSE file for details

## Support

For support, contact:
- Email: support@organization.com
- Slack: #task-management-support