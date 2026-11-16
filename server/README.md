# Hospital Server / Fog Layer

The central hospital server runs Docker Compose microservices containing:
- **FastAPI**: REST API backend for patient management, alert logging, and OTA orchestration.
- **Mosquitto**: MQTT Broker for edge-server communication.
- **PostgreSQL + TimescaleDB**: Time-series database storing EEG event windows and patient metadata.
- **Retraining & Model Registry**: Retrains models based on doctor validations and handles OTA deployment.

## Deployment
```bash
cd server
docker-compose up -d --build
```
