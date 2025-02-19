# Configure AWS provider requirements
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Redis subnet group for cluster deployment
resource "aws_elasticache_subnet_group" "redis_subnet" {
  name        = "task-mgmt-redis-subnet-group"
  description = "Subnet group for Task Management System Redis cluster"
  subnet_ids  = var.private_subnet_ids

  tags = var.tags
}

# Redis parameter group with optimized settings
resource "aws_elasticache_parameter_group" "redis_params" {
  family      = "redis7.0"
  name        = "task-mgmt-redis-params"
  description = "Redis parameter group for Task Management System"

  # Performance optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "active-defrag-cycle-min"
    value = "25"
  }

  parameter {
    name  = "active-defrag-cycle-max"
    value = "75"
  }

  tags = var.tags
}

# Redis replication group configuration
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id = "task-mgmt-redis"
  description         = "Redis cluster for Task Management System"

  # Node configuration
  node_type               = "cache.t4g.medium"
  num_cache_clusters      = 2
  port                   = 6379
  parameter_group_name    = aws_elasticache_parameter_group.redis_params.name
  subnet_group_name      = aws_elasticache_subnet_group.redis_subnet.name
  security_group_ids     = var.security_group_ids

  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Encryption configuration
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  
  # Engine configuration
  engine         = "redis"
  engine_version = "7.0"

  # Maintenance settings
  maintenance_window      = "sun:05:00-sun:09:00"
  snapshot_window        = "00:00-04:00"
  snapshot_retention_limit = 7
  apply_immediately       = false
  auto_minor_version_upgrade = true

  # Monitoring
  notification_topic_arn = var.sns_topic_arn

  tags = var.tags
}

# Output the Redis endpoints
output "redis_endpoints" {
  description = "Redis cluster endpoints"
  value = {
    primary_endpoint = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
    port            = aws_elasticache_replication_group.redis_cluster.port
  }
}

# Output the parameter group details
output "parameter_group" {
  description = "Redis parameter group details"
  value = {
    id  = aws_elasticache_parameter_group.redis_params.id
    arn = aws_elasticache_parameter_group.redis_params.arn
  }
}

# Variables
variable "private_subnet_ids" {
  description = "List of private subnet IDs for Redis deployment"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for Redis cluster"
  type        = list(string)
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for Redis notifications"
  type        = string
}

variable "tags" {
  description = "Tags to be applied to all resources"
  type        = map(string)
  default     = {}
}