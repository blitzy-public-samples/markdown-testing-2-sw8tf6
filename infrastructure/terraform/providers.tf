# Configure Terraform and required providers
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
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# Configure AWS Provider with comprehensive tagging strategy
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project          = "task-management-system"
      Environment      = var.environment
      ManagedBy       = "Terraform"
      Owner           = "DevOps"
      SecurityLevel   = "High"
      BackupRequired  = "true"
      ComplianceLevel = "Standard"
    }
  }
}

# Data sources for EKS cluster configuration
data "aws_eks_cluster" "main" {
  name = "task-management-system-${var.environment}"
}

data "aws_eks_cluster_auth" "main" {
  name = "task-management-system-${var.environment}"
}

# Configure Kubernetes provider for EKS management
provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      "task-management-system-${var.environment}"
    ]
  }
}

# Configure Helm provider for Kubernetes applications deployment
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        "task-management-system-${var.environment}"
      ]
    }
  }
}