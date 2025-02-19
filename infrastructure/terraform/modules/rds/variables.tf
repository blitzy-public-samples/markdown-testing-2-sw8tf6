# Terraform AWS RDS Module Variables
# Version: ~> 1.5
# Purpose: Define input variables for RDS PostgreSQL configuration

variable "environment" {
  type        = string
  description = "The environment name (e.g., development, staging, production) used for resource naming and tagging. Must follow naming convention: lowercase, no spaces, max 10 characters"

  validation {
    condition     = can(regex("^[a-z0-9]{1,10}$", var.environment))
    error_message = "Environment name must be lowercase alphanumeric, maximum 10 characters."
  }
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC where RDS will be deployed. VPC must have DNS hostnames and DNS resolution enabled"

  validation {
    condition     = can(regex("^vpc-[a-z0-9]{8,}$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier."
  }
}

variable "private_subnets" {
  type        = list(string)
  description = "List of private subnet IDs for RDS subnet group. Minimum 2 subnets in different AZs required for high availability"

  validation {
    condition     = length(var.private_subnets) >= 2
    error_message = "At least 2 private subnets must be provided for high availability."
  }

  validation {
    condition     = can([for subnet in var.private_subnets : regex("^subnet-[a-z0-9]{8,}$", subnet)])
    error_message = "All subnet IDs must be valid AWS subnet identifiers."
  }
}

variable "private_subnets_cidr_blocks" {
  type        = list(string)
  description = "List of private subnet CIDR blocks for security group rules. Must be in valid CIDR notation (e.g., 10.0.0.0/24)"

  validation {
    condition     = can([for cidr in var.private_subnets_cidr_blocks : regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/([0-9]|[1-2][0-9]|3[0-2])$", cidr)])
    error_message = "All CIDR blocks must be in valid IPv4 CIDR notation."
  }
}

variable "engine_version" {
  type        = string
  description = "The version of PostgreSQL to use. Supported versions: 15.x. Regular upgrades required for security compliance"
  default     = "15.4"

  validation {
    condition     = can(regex("^15\\.[0-9]+$", var.engine_version))
    error_message = "PostgreSQL version must be 15.x."
  }
}

variable "instance_class" {
  type        = string
  description = "The instance type for the RDS instance. Minimum recommended: db.t3.large for production workloads"
  default     = "db.t3.large"

  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.instance_class))
    error_message = "Instance class must be a valid RDS instance type."
  }
}

variable "allocated_storage" {
  type        = number
  description = "The amount of storage to allocate in GB. Minimum 100GB, supports auto-scaling up to 1TB"
  default     = 100

  validation {
    condition     = var.allocated_storage >= 100 && var.allocated_storage <= 1024
    error_message = "Allocated storage must be between 100GB and 1024GB (1TB)."
  }
}

variable "db_username" {
  type        = string
  description = "The master username for the PostgreSQL database. Must be 1-16 characters, alphanumeric only, cannot be 'postgres'"
  sensitive   = true

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9]{0,15}$", var.db_username)) && var.db_username != "postgres"
    error_message = "Username must be 1-16 alphanumeric characters, start with a letter, and cannot be 'postgres'."
  }
}

variable "db_password" {
  type        = string
  description = "The master password for the PostgreSQL database. Must be 16+ characters with at least one of each: uppercase, lowercase, number, special character"
  sensitive   = true

  validation {
    condition     = can(regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+])[a-zA-Z0-9!@#$%^&*()_+]{16,}$", var.db_password))
    error_message = "Password must be at least 16 characters and include uppercase, lowercase, number, and special character."
  }
}