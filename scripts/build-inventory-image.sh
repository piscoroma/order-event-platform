docker build \
   -f docker/Dockerfile \
   --build-arg SERVICE_NAME=inventory-service \
   --build-arg SERVICE_PORT=3010 \
   -t inventory-service:test .
