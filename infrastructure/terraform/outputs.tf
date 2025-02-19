# AWS Provider version ~> 5.0

# Environment Information
output "environment" {
  description = "Current deployment environment (development/staging/production)"
  value       = var.environment
  sensitive   = false
}

# VPC Networking
output "vpc_id" {
  description = "VPC ID for network configuration"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for resource placement"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for resource placement"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

# EKS Cluster
output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint for kubectl configuration"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_name" {
  description = "EKS cluster name for resource tagging"
  value       = module.eks.cluster_name
  sensitive   = false
}

output "eks_security_group_id" {
  description = "EKS cluster security group ID for network policies"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}

# RDS Database
output "rds_endpoint" {
  description = "RDS database endpoint for application connection"
  value       = module.rds.endpoint
  sensitive   = false
}

output "rds_port" {
  description = "RDS database port for application connection"
  value       = module.rds.port
  sensitive   = false
}

# ElastiCache Redis
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint for caching configuration"
  value       = module.elasticache.primary_endpoint
  sensitive   = false
}

output "redis_port" {
  description = "ElastiCache Redis port for caching configuration"
  value       = module.elasticache.port
  sensitive   = false
}

# S3 Storage
output "s3_bucket_name" {
  description = "S3 bucket name for file storage configuration"
  value       = module.s3.bucket_name
  sensitive   = false
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN for IAM policy configuration"
  value       = module.s3.bucket_arn
  sensitive   = false
}

# CloudFront CDN
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for CDN configuration"
  value       = module.cloudfront.distribution_id
  sensitive   = false
}

# Route53 DNS
output "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS configuration"
  value       = module.route53.zone_id
  sensitive   = false
}