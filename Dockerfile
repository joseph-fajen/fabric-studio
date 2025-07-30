# YouTube Fabric Processor - Railway Deployment
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Install Go 1.22+ manually (fabric requires newer version)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then GO_ARCH="amd64"; else GO_ARCH="arm64"; fi && \
    curl -L https://go.dev/dl/go1.22.10.linux-${GO_ARCH}.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

# Set Go environment and create directories
ENV GOPATH=/go
ENV PATH=$PATH:/go/bin
RUN mkdir -p /go/bin

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Install yt-dlp globally and in virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install yt-dlp
# Also install globally as backup
RUN pip3 install --break-system-packages yt-dlp
# Verify installation
RUN yt-dlp --version || echo "yt-dlp installation verification failed"

# Install Fabric CLI
RUN go install github.com/danielmiessler/fabric/cmd/fabric@latest

# Create Fabric configuration directory
RUN mkdir -p /root/.config/fabric

# Copy application code
COPY . .

# Make fabric configuration script executable
RUN chmod +x /app/configure-fabric.sh

# Create outputs directory
RUN mkdir -p outputs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application with Fabric configuration
CMD ["/bin/bash", "-c", "/app/configure-fabric.sh && npm start"]