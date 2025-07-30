#!/bin/bash

# Configure Fabric CLI for Railway deployment
echo "Configuring Fabric CLI..."

# Create config directory
mkdir -p /root/.config/fabric

# Substitute environment variables in config template
envsubst < /app/fabric-config-template.yaml > /root/.config/fabric/.fabricrc

# Create .env file that newer fabric versions expect
cat > /root/.config/fabric/.env << EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
EOF

# Make sure fabric can find patterns
fabric --updatepatterns > /dev/null 2>&1 || echo "Pattern update failed, continuing..."

echo "Fabric CLI configuration complete"