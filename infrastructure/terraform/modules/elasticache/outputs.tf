# Redis cluster identifier output
output "redis_cluster_id" {
  description = "The unique identifier of the ElastiCache Redis replication group used for resource referencing and monitoring"
  value       = aws_elasticache_replication_group.redis_cluster.id
}

# Primary endpoint output for write operations
output "primary_endpoint" {
  description = "The primary endpoint address for Redis write operations, cluster management, and high-availability failover"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

# Reader endpoint output for read operations
output "reader_endpoint" {
  description = "The reader endpoint address for Redis read operations, supporting load distribution and read scaling"
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
}

# Redis port output
output "port" {
  description = "The port number used for Redis connections, essential for security group configuration and client setup"
  value       = aws_elasticache_replication_group.redis_cluster.port
}