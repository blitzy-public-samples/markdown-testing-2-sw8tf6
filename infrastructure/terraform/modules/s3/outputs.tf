# Output definitions for the S3 storage module
# These outputs expose critical bucket attributes for integration with other AWS services
# and application components in the Task Management System

output "bucket_id" {
  description = "The ID of the S3 bucket used for task management system file storage"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket for use in IAM policies and resource configurations"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket for constructing S3 endpoint URLs"
  value       = aws_s3_bucket.main.bucket_domain_name
}