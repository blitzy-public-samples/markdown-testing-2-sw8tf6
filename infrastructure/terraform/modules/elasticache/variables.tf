# Node type configuration for Redis cluster
variable "node_type" {
  type        = string
  description = "The compute and memory capacity of the nodes"
  default     = "cache.t4g.medium"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.node_type))
    error_message = "Node type must be a valid ElastiCache instance type"
  }
}

# Number of cache nodes in the cluster
variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster"
  default     = 2

  validation {
    condition     = var.num_cache_nodes >= 2
    error_message = "At least 2 nodes are required for high availability"
  }
}

# Redis port configuration
variable "port" {
  type        = number
  description = "Port number for Redis connections"
  default     = 6379

  validation {
    condition     = var.port > 0 && var.port < 65536
    error_message = "Port must be between 1 and 65535"
  }
}

# Redis parameter group family version
variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family version"
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis[0-9]\\.[0-9]$", var.parameter_group_family))
    error_message = "Parameter group family must be a valid Redis version"
  }
}

# Subnet configuration for Redis deployment
variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Redis cluster deployment"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability"
  }
}

# Security group configuration
variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs for Redis cluster"

  validation {
    condition     = length(var.security_group_ids) > 0
    error_message = "At least one security group ID is required"
  }
}

# Automatic failover configuration
variable "automatic_failover_enabled" {
  type        = bool
  description = "Enable automatic failover for Redis cluster"
  default     = true
}

# Multi-AZ deployment configuration
variable "multi_az_enabled" {
  type        = bool
  description = "Enable Multi-AZ deployment for Redis cluster"
  default     = true
}

# Encryption at rest configuration
variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Enable encryption at rest for Redis cluster"
  default     = true
}

# Transit encryption configuration
variable "transit_encryption_enabled" {
  type        = bool
  description = "Enable encryption in transit for Redis cluster"
  default     = true
}

# Maintenance window configuration
variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "sun:05:00-sun:09:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format 'ddd:hh:mm-ddd:hh:mm'"
  }
}

# Snapshot retention configuration
variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days for which ElastiCache will retain automatic cache cluster snapshots"
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources"
  default = {
    Environment = "production"
    Service     = "task-management"
    ManagedBy   = "terraform"
  }
}