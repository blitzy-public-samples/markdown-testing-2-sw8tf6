# Output for EKS cluster ID
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

# Output for EKS cluster endpoint URL
output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

# Output for EKS cluster certificate authority data
output "cluster_certificate_authority" {
  description = "The certificate authority data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority
  sensitive   = true
}

# Output for EKS node group ID
output "node_group_id" {
  description = "The ID of the EKS node group"
  value       = aws_eks_node_group.main.id
}

# Output for EKS node group status
output "node_group_status" {
  description = "The current status of the EKS node group"
  value       = aws_eks_node_group.main.status
}