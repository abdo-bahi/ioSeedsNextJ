#!/bin/sh
set -e  # stop on any error

echo "🌱 Setting up irrigation app..."

# Load .env
source .env

# 1. Create empty passwd file if it doesn't exist
mkdir -p docker
type nul > docker\mosquitto_passwd

# 2. Start containers
echo "🐳 Starting containers..."
docker compose up -d

# 3. Wait for Mosquitto to be healthy
echo "⏳ Waiting for Mosquitto..."
until docker exec irrigation_mqtt mosquitto_pub \
  -h localhost -t test -m ping 2>/dev/null; do
  sleep 2
done

# 4. Create MQTT user automatically from .env values
echo "🔐 Creating MQTT user..."
docker exec irrigation_mqtt mosquitto_passwd \
  -b /mosquitto/config/passwd $MQTT_USER $MQTT_PASSWORD

# 5. Restart Mosquitto to pick up the new passwd file
docker restart irrigation_mqtt

echo "✅ Done! Containers running:"
docker ps --filter "name=irrigation_"