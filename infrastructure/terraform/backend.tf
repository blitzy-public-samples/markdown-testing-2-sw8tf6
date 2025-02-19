# Backend configuration for Task Management System Terraform state
# Version: ~> 5.0
# Purpose: Manages infrastructure state with versioning, encryption, and locking capabilities

terraform {
  backend "s3" {
    bucket         = "task-management-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "task-management-terraform-locks"
  }
}

# S3 bucket for storing Terraform state files
resource "aws_s3_bucket" "terraform_state" {
  bucket = "task-management-terraform-state"

  # Enable versioning for state file history and recovery
  versioning {
    enabled = true
  }

  # Enable server-side encryption for data at rest
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Name        = "Task Management System Terraform State"
    Environment = "Management"
    Purpose     = "Infrastructure State Storage"
  }
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "task-management-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Task Management System Terraform Locks"
    Environment = "Management"
    Purpose     = "State Locking"
  }
}