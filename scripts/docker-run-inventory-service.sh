docker run \
  -p 3010:3010 \
  --env-file services/inventory-service/.env \
  inventory-service:test
