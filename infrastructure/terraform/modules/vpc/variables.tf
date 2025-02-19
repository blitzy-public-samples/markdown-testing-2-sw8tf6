# Environment identifier for resource tagging
variable "environment" {
  type        = string
  description = "Environment identifier (development, staging, production)"
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# CIDR block for the VPC network
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC network"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR block must be a valid IPv4 CIDR notation."
  }
}

# Availability zones for subnet deployment
variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for subnet deployment"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability."
  }
}

# DNS hostnames configuration
variable "enable_dns_hostnames" {
  type        = bool
  description = "Enable DNS hostnames in the VPC"
  default     = true
}

# DNS support configuration
variable "enable_dns_support" {
  type        = bool
  description = "Enable DNS support in the VPC"
  default     = true
}

# NAT Gateway configuration
variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnets"
  default     = true
}

# High availability NAT Gateway configuration
variable "single_nat_gateway" {
  type        = bool
  description = "Use a single NAT Gateway for all private subnets (false for high availability)"
  default     = false
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Additional tags for VPC resources"
  default     = {}

  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags can be specified."
  }
}