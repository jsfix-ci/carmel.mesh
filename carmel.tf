terraform {
  required_providers {
    linode = {
      source = "linode/linode"
      version = "1.14.3"
    }
  }
}

provider "linode" {
    token = var.token
}

resource "linode_lke_cluster" "carmel" {
    label       = "carmel"
    k8s_version = "1.21"
    region      = var.region
    tags        = ["carmel", "production"]

    pool {
        type  = "g6-standard-1"
        count = 3
    }
}

output "kubeconfig" {
   value = linode_lke_cluster.carmel.kubeconfig
}

output "api_endpoints" {
   value = linode_lke_cluster.carmel.api_endpoints
}

output "status" {
   value = linode_lke_cluster.carmel.status
}

output "id" {
   value = linode_lke_cluster.carmel.id
}

output "pool" {
   value = linode_lke_cluster.carmel.pool
}

variable "token" {}
variable "root_pass" {}
variable "ssh_key" {}
variable "region" {}
