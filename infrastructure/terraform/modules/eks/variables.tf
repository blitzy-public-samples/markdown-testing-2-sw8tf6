# Input variables for AWS EKS module configuration

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for the Task Management System"
  
  validation {
    condition     = length(var.cluster_name) > 0 && length(var.cluster_name) <= 100 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must be between 1 and 100 characters, start with a letter, and contain only alphanumeric characters and hyphens"
  }
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster (must be 1.27 or higher as per requirements)"
  default     = "1.27"
  
  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.cluster_version))
    error_message = "Cluster version must be 1.27 or higher as per system requirements"
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be created for the Task Management System"
  
  validation {
    condition     = can(regex("^vpc-[a-z0-9]{8,}$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for EKS cluster and node groups (minimum 2 subnets across different AZs required for HA)"
  
  validation {
    condition     = length(var.subnet_ids) >= 2 && length(distinct([for s in var.subnet_ids : substr(s, -1, 1)])) >= 2
    error_message = "At least 2 subnets in different availability zones are required for high availability"
  }
}

variable "node_instance_types" {
  type        = list(string)
  description = "List of EC2 instance types for EKS node groups (must be production-grade instances)"
  default     = ["t3.large", "t3.xlarge", "m5.large", "m5.xlarge"]
  
  validation {
    condition     = alltrue([for t in var.node_instance_types : can(regex("^(t3\\.|m5\\.|c5\\.|r5\\.).*$", t))])
    error_message = "Instance types must be production-grade (t3, m5, c5, or r5 series)"
  }
}

variable "node_desired_size" {
  type        = number
  description = "Desired number of nodes in EKS node group (must be between min and max)"
  default     = 2
  
  validation {
    condition     = var.node_desired_size >= 2
    error_message = "Desired size must be at least 2 for high availability"
  }
}

variable "node_min_size" {
  type        = number
  description = "Minimum number of nodes in EKS node group"
  default     = 2
  
  validation {
    condition     = var.node_min_size >= 2
    error_message = "Minimum size must be at least 2 for high availability"
  }
}

variable "node_max_size" {
  type        = number
  description = "Maximum number of nodes in EKS node group"
  default     = 10
  
  validation {
    condition     = var.node_max_size >= var.node_min_size && var.node_max_size >= var.node_desired_size
    error_message = "Maximum size must be greater than or equal to both minimum and desired sizes"
  }
}

variable "enable_private_access" {
  type        = bool
  description = "Enable private API server endpoint access (recommended for security)"
  default     = true
}

variable "enable_public_access" {
  type        = bool
  description = "Enable public API server endpoint access (should be disabled in production)"
  default     = false
}

variable "encryption_config" {
  type = object({
    enabled    = bool
    kms_key_id = string
    resources  = list(string)
  })
  description = "EKS cluster encryption configuration for sensitive data"
  default = {
    enabled    = true
    kms_key_id = ""
    resources  = ["secrets"]
  }
}

variable "logging_types" {
  type        = list(string)
  description = "List of EKS control plane logging types to enable"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  validation {
    condition     = alltrue([for t in var.logging_types : contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], t)])
    error_message = "Invalid logging type specified"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources (must include required system tags)"
  default = {
    Environment = "production"
    System      = "task-management"
    ManagedBy   = "terraform"
  }
  
  validation {
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "System")
    error_message = "Tags must include 'Environment' and 'System' keys"
  }
}