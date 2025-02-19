# Variable definitions for the S3 storage module used in the Task Management System

variable "environment" {
  type        = string
  description = "The deployment environment for the S3 bucket (development, staging, production)"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "bucket_name" {
  type        = string
  description = "The name of the S3 bucket, must comply with AWS naming conventions and organization standards"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name)) && length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be 3-63 characters long, contain only lowercase alphanumeric characters or hyphens, and cannot start or end with a hyphen"
  }
}

variable "versioning_enabled" {
  type        = bool
  description = "Enable versioning for maintaining multiple variants of objects for data protection and recovery"
  default     = true
}

variable "encryption_enabled" {
  type        = bool
  description = "Enable server-side encryption using AWS KMS for data-at-rest protection"
  default     = true
}

variable "lifecycle_glacier_transition_days" {
  type        = number
  description = "Number of days after which objects should transition to Glacier storage class for cost optimization"
  default     = 90
  
  validation {
    condition     = var.lifecycle_glacier_transition_days >= 30 && var.lifecycle_glacier_transition_days <= 365
    error_message = "Glacier transition period must be between 30 and 365 days"
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for cost allocation, environment identification, and resource management"
  default = {
    ManagedBy = "terraform"
    Service   = "task-management-system"
  }
}