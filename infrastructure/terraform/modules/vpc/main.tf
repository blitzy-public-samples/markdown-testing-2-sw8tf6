# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for subnet calculations
locals {
  private_subnet_count = length(var.availability_zones)
  public_subnet_count  = length(var.availability_zones)
  total_subnets       = local.private_subnet_count + local.public_subnet_count
  subnet_newbits      = ceil(log(local.total_subnets, 2)) + 1
}

# VPC resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Private subnets
resource "aws_subnet" "private" {
  count             = local.private_subnet_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, local.subnet_newbits, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.environment}-private-${count.index + 1}"
    Environment = var.environment
    Tier        = "private"
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Public subnets
resource "aws_subnet" "public" {
  count                   = local.public_subnet_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, local.subnet_newbits, count.index + local.private_subnet_count)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.environment}-public-${count.index + 1}"
    Environment = var.environment
    Tier        = "public"
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.environment}-igw"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = local.private_subnet_count
  domain = "vpc"

  tags = {
    Name        = "${var.environment}-eip-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = local.private_subnet_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "${var.environment}-nat-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.environment}-public-rt"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = local.private_subnet_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "${var.environment}-private-rt-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "task-management-system"
  }
}

# Route table associations for public subnets
resource "aws_route_table_association" "public" {
  count          = local.public_subnet_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route table associations for private subnets
resource "aws_route_table_association" "private" {
  count          = local.private_subnet_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}