#!/bin/bash

set -e

IMAGE_NAME="${1:-node-prod-test}"
TEST_CONFIG="${2:-container-structure-test.yml}"

echo "=========================================="
echo "Testing Docker image: $IMAGE_NAME"
echo "Test config: $TEST_CONFIG"
echo "=========================================="

if ! command -v container-structure-test &> /dev/null; then
    echo "container-structure-test not found. Installing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -LO https://storage.googleapis.com/container-structure-test/latest/container-structure-test-darwin-amd64
        chmod +x container-structure-test-darwin-amd64
        sudo mv container-structure-test-darwin-amd64 /usr/local/bin/container-structure-test
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -LO https://storage.googleapis.com/container-structure-test/latest/container-structure-test-linux-amd64
        chmod +x container-structure-test-linux-amd64
        sudo mv container-structure-test-linux-amd64 /usr/local/bin/container-structure-test
    else
        echo "Unsupported OS: $OSTYPE"
        exit 1
    fi
fi

echo "Building production image..."
docker build -f Dockerfile.prod -t "$IMAGE_NAME" .

echo ""
echo "Running container structure tests..."
container-structure-test test \
    --image "$IMAGE_NAME" \
    --config "$TEST_CONFIG"

echo ""
echo "=========================================="
echo "All tests completed successfully!"
echo "=========================================="

echo ""
echo "Image size:"
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep "$IMAGE_NAME"
