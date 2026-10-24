#!/usr/bin/env bash
# Setup 1.5GB Swap for 1GB VPS to prevent Linux Out-Of-Memory (OOM) killer crashes
set -euo pipefail

echo "=============================================="
echo " Setting up 1.5GB Swap for 1GB VPS"
echo "=============================================="

# Check if swap already exists and is active
CURRENT_SWAP=$(swapon --show | wc -l)
if [ "$CURRENT_SWAP" -gt 1 ]; then
    echo "Swap is already active on this system:"
    swapon --show
    free -h
    exit 0
fi

if [ -f /swapfile ]; then
    echo "Swapfile exists at /swapfile, enabling..."
    chmod 600 /swapfile
    mkswap /swapfile 2>/dev/null || true
    swapon /swapfile
else
    echo "Allocating 1.5GB swapfile at /swapfile..."
    fallocate -l 1.5G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1536 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
fi

# Ensure persistence across reboots
if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Added /swapfile to /etc/fstab"
fi

# Set swappiness to 10 (conserve SSD write cycles, only swap under actual memory pressure)
sysctl vm.swappiness=10
if ! grep -q 'vm.swappiness=10' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# Set vfs_cache_pressure to 50 for smoother memory reclaim
sysctl vm.vfs_cache_pressure=50
if ! grep -q 'vm.vfs_cache_pressure=50' /etc/sysctl.conf; then
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
fi

echo "Swap setup completed successfully!"
free -h
