docker run \
  -p 3011:3011 \
  -v "$(pwd)/services/auth-service/certs:/app/services/auth-service/certs:ro" \
  --env-file services/auth-service/.env \
  auth-service:test
