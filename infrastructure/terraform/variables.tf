# Task Management System Infrastructure Variables
# Defines configuration for AWS infrastructure deployment across multiple environments

# Environment Configuration
variable "environment" {
  type        = string
  description = "Deployment environment identifier (development, staging, production) that determines resource configurations and scaling parameters"
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# AWS Region Configuration
variable "aws_region" {
  type        = string
  description = "AWS region for primary infrastructure deployment. For production, should be in a region with at least 3 Availability Zones"
  default     = "us-west-2"

  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "Must be a valid AWS region identifier."
  }
}

# Network Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC, must be large enough to accommodate all subnets including EKS, RDS, and ElastiCache"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

# EKS Configuration
variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for EKS cluster, must be supported by AWS and align with application requirements"
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[0-9])$", var.eks_cluster_version))
    error_message = "Must be a valid and supported EKS version (e.g., 1.27)."
  }
}

variable "eks_node_instance_types" {
  type        = list(string)
  description = "List of EC2 instance types for EKS worker nodes, ordered by preference. Should include both CPU and memory optimized instances"
  default     = ["t3.medium", "t3.large"]

  validation {
    condition     = length(var.eks_node_instance_types) > 0
    error_message = "At least one instance type must be specified."
  }
}

variable "eks_node_desired_size" {
  type        = number
  description = "Desired number of worker nodes in EKS cluster for normal operation"
  default     = 2

  validation {
    condition     = var.eks_node_desired_size >= 2
    error_message = "Desired size must be at least 2 for high availability."
  }
}

variable "eks_node_min_size" {
  type        = number
  description = "Minimum number of worker nodes in EKS cluster to maintain high availability"
  default     = 2

  validation {
    condition     = var.eks_node_min_size >= 2
    error_message = "Minimum size must be at least 2 for high availability."
  }
}

variable "eks_node_max_size" {
  type        = number
  description = "Maximum number of worker nodes in EKS cluster for peak load handling"
  default     = 10

  validation {
    condition     = var.eks_node_max_size <= 20 && var.eks_node_max_size > var.eks_node_min_size
    error_message = "Maximum size must be greater than minimum size and not exceed 20."
  }
}

# RDS Configuration
variable "rds_instance_class" {
  type        = string
  description = "Instance class for RDS PostgreSQL database, sized according to expected workload"
  default     = "db.t3.medium"

  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.rds_instance_class))
    error_message = "Must be a valid RDS instance class identifier."
  }
}

variable "rds_allocated_storage" {
  type        = number
  description = "Allocated storage in GB for RDS instance with room for growth"
  default     = 20

  validation {
    condition     = var.rds_allocated_storage >= 20 && var.rds_allocated_storage <= 16384
    error_message = "Allocated storage must be between 20 and 16384 GB."
  }
}

variable "rds_engine_version" {
  type        = string
  description = "PostgreSQL engine version for RDS, must be compatible with application requirements"
  default     = "15.0"

  validation {
    condition     = can(regex("^\\d+\\.\\d+$", var.rds_engine_version))
    error_message = "Must be a valid PostgreSQL version number."
  }
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  type        = string
  description = "Node type for ElastiCache Redis cluster, sized for memory requirements"
  default     = "cache.t3.medium"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.elasticache_node_type))
    error_message = "Must be a valid ElastiCache node type identifier."
  }
}

variable "elasticache_num_nodes" {
  type        = number
  description = "Number of nodes in ElastiCache Redis cluster for high availability"
  default     = 2

  validation {
    condition     = var.elasticache_num_nodes >= 2
    error_message = "Must have at least 2 nodes for cluster mode."
  }
}

# Storage Configuration
variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for file storage, must be globally unique"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.s3_bucket_name))
    error_message = "Must be a valid S3 bucket name and follow naming conventions."
  }
}

# Domain Configuration
variable "domain_name" {
  type        = string
  description = "Domain name for the application, used for Route 53 and SSL certificate configuration"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}$", var.domain_name))
    error_message = "Must be a valid domain name."
  }
}

# Security Configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption for sensitive data using AWS KMS across all applicable services"
  default     = true

  validation {
    condition     = var.enable_encryption == true
    error_message = "Encryption must be enabled for production environments."
  }
}

variable "enable_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability across all supported services"
  default     = true

  validation {
    condition     = var.enable_multi_az == true
    error_message = "Multi-AZ must be enabled for production environments."
  }
}