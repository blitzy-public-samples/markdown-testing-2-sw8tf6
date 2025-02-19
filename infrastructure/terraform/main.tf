# Task Management System Infrastructure
# Main Terraform configuration for AWS infrastructure deployment

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # Backend configuration should be provided via backend config file or CLI
    key = "terraform.tfstate"
  }
}

# Primary region provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = local.common_tags
  }
}

# DR region provider
provider "aws" {
  alias  = "dr"
  region = var.aws_secondary_region
  
  default_tags {
    tags = local.common_tags
  }
}

locals {
  project_name = "task-management-system"
  common_tags = {
    Project       = local.project_name
    Environment   = var.environment
    ManagedBy     = "Terraform"
    CostCenter    = "TMS-${var.environment}"
    SecurityLevel = "High"
  }
}

# Primary VPC
module "vpc" {
  source = "./modules/vpc"
  
  environment         = var.environment
  region             = var.aws_region
  vpc_cidr           = var.vpc_cidr
  enable_flow_logs   = true
  enable_vpc_endpoints = true
  
  tags = local.common_tags
}

# DR VPC
module "vpc_dr" {
  source = "./modules/vpc"
  providers = {
    aws = aws.dr
  }
  
  environment         = var.environment
  region             = var.aws_secondary_region
  vpc_cidr           = var.vpc_cidr
  enable_flow_logs   = true
  enable_vpc_endpoints = true
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  environment        = var.environment
  vpc_id            = module.vpc.vpc_id
  private_subnets   = module.vpc.private_subnets
  cluster_version   = var.eks_cluster_version
  node_instance_types = var.eks_node_instance_types
  enable_encryption = true
  enable_monitoring = true
  
  tags = local.common_tags
}

# RDS Database
module "rds" {
  source = "./modules/rds"
  
  environment              = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_subnets         = module.vpc.private_subnets
  instance_class          = var.rds_instance_class
  multi_az                = true
  backup_retention_period = 30
  enable_performance_insights = true
  enable_encryption      = true
  
  tags = local.common_tags
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"
  
  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnets     = module.vpc.private_subnets
  node_type           = var.elasticache_node_type
  num_cache_nodes     = var.elasticache_num_nodes
  enable_encryption   = true
  enable_auto_failover = true
  
  tags = local.common_tags
}

# WAF Configuration
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.project_name}-${var.environment}"
  description = "WAF rules for Task Management System"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "rate-limit-rule"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${local.project_name}-waf-metrics"
    sampled_requests_enabled  = true
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.project_name}-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EKS", "cluster_failed_node_count", "ClusterName", module.eks.cluster_name],
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", module.rds.instance_id],
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", module.elasticache.cluster_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "System Health Metrics"
        }
      }
    ]
  })
}

# AWS Backup Plan
resource "aws_backup_plan" "main" {
  name = "${local.project_name}-${var.environment}"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = "Default"
    schedule          = "cron(0 5 ? * * *)"

    lifecycle {
      cold_storage_after = 30
      delete_after       = 90
    }
  }

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "ID of the primary VPC"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "Endpoint for EKS cluster"
  sensitive   = true
}

output "rds_endpoint" {
  value       = module.rds.endpoint
  description = "Endpoint for RDS instance"
  sensitive   = true
}

output "cloudfront_distribution_id" {
  value       = module.cloudfront.distribution_id
  description = "ID of the CloudFront distribution"
}