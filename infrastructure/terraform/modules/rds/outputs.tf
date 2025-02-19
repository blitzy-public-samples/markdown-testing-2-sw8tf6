# RDS PostgreSQL Module Outputs
# Version: ~> 1.5
# Purpose: Expose essential RDS instance information for application configuration and infrastructure management

output "db_endpoint" {
  description = "The connection endpoint for the RDS PostgreSQL instance"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_name" {
  description = "The name of the default database"
  value       = aws_db_instance.main.db_name
}

output "db_subnet_group_id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.main.id
}

output "db_security_group_id" {
  description = "The ID of the security group associated with the RDS instance"
  value       = aws_security_group.rds.id
}