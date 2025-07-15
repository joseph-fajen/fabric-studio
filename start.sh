#!/bin/bash

# YouTube Fabric Processor Startup Script

echo "🎬 YouTube Fabric Processor"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create outputs directory
mkdir -p outputs

# Check fabric installation (optional)
if command -v fabric &> /dev/null; then
    echo "✅ Fabric command found - Full processing mode enabled"
else
    echo "⚠️  Fabric not found - Running in simulation mode"
    echo "   To enable full processing, install fabric with:"
    echo "   npm install -g fabric-mcp-server"
fi

echo ""
echo "🚀 Starting server..."
echo "   Open your browser to: http://localhost:3000"
echo ""

# Start the server
npm start