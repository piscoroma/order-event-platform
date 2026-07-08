docker build \
   -f docker/Dockerfile \
   --build-arg SERVICE_NAME=auth-service \
   --build-arg SERVICE_PORT=3011 \
   -t auth-service:test .
