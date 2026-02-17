# AQI Predictor - Monitoring and Observability Guide

## Overview

This guide provides comprehensive information about the monitoring and observability infrastructure for the AQI Predictor system. The system implements a complete observability stack including metrics collection, distributed tracing, structured logging, and alerting.

## Architecture

### Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **Jaeger** - Distributed tracing
4. **Structured Logging** - JSON-formatted application logs
5. **Alert Manager** - System alerting and notifications
6. **Uptime Monitor** - SLA tracking and availability monitoring

## Metrics Collection

### Prometheus Metrics

The system exposes Prometheus-compatible metrics at `/metrics` endpoint.

#### Available Metrics

**HTTP Metrics:**
- `aqi_http_requests_total` - Total HTTP requests by method, endpoint, and status
- `aqi_http_request_duration_seconds` - Request duration histogram
- `aqi_http_requests_in_progress` - Current requests in progress

**ML Model Metrics:**
- `aqi_model_predictions_total` - Total predictions by model and version
- `aqi_model_prediction_duration_seconds` - Prediction duration histogram
- `aqi_model_rmse` - Model RMSE by model and version
- `aqi_model_mae` - Model MAE by model and version
- `aqi_model_accuracy_percent` - Model accuracy percentage

**Data Pipeline Metrics:**
- `aqi_data_ingestion_total` - Total data points ingested by source
- `aqi_data_ingestion_errors_total` - Ingestion errors by source and type
- `aqi_data_quality_issues_total` - Data quality issues by type
- `aqi_data_processing_duration_seconds` - Processing duration histogram

**System Metrics:**
- `aqi_system_cpu_percent` - CPU usage percentage
- `aqi_system_memory_percent` - Memory usage percentage
- `aqi_system_disk_usage_percent` - Disk usage percentage
- `aqi_app_uptime_seconds` - Application uptime

**Cache Metrics:**
- `aqi_cache_hits_total` - Cache hits by type
- `aqi_cache_misses_total` - Cache misses by type

**Database Metrics:**
- `aqi_db_connections_active` - Active database connections
- `aqi_db_query_duration_seconds` - Query duration histogram

**Celery Metrics:**
- `aqi_celery_tasks_total` - Total Celery tasks by name and status
- `aqi_celery_task_duration_seconds` - Task duration histogram
- `aqi_celery_tasks_in_progress` - Tasks currently in progress

### Accessing Metrics

**Prometheus UI:**
```
http://localhost:9090
```

**Metrics Endpoint:**
```
http://localhost:8000/metrics
```

**Example Query:**
```promql
# Average request rate over 5 minutes
rate(aqi_http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(aqi_http_request_duration_seconds_bucket[5m]))

# Error rate percentage
(sum(rate(aqi_http_requests_total{status=~"5.."}[5m])) / sum(rate(aqi_http_requests_total[5m]))) * 100
```

## Grafana Dashboards

### Available Dashboards

1. **System Overview** - High-level system health and performance
2. **ML Models Performance** - Model accuracy, predictions, and errors
3. **Data Pipeline** - Data ingestion, quality, and processing

### Accessing Grafana

**URL:** `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin`

### Dashboard Features

- Real-time metrics visualization
- Customizable time ranges
- Alert annotations
- Drill-down capabilities
- Export and sharing options

## Distributed Tracing

### OpenTelemetry Integration

The system uses OpenTelemetry for distributed tracing with Jaeger as the backend.

### Accessing Jaeger UI

**URL:** `http://localhost:16686`

### Trace Information

Each trace includes:
- Request ID and correlation
- Service name and version
- Operation name and duration
- Span relationships (parent-child)
- Tags and attributes
- Error information

### Using Tracing in Code

```python
from src.api.tracing import trace_operation, add_span_attributes

# Trace an operation
with trace_operation("fetch_weather_data", {"location": "Delhi"}):
    data = fetch_weather_data("Delhi")
    add_span_attributes({"data_points": len(data)})
```

## Structured Logging

### JSON Logging Format

All logs are output in JSON format for easy parsing and analysis.

**Example Log Entry:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "logger": "src.api.main",
  "message": "Request processed successfully",
  "service": "aqi-predictor-api",
  "environment": "production",
  "request_id": "req-123456",
  "user_id": "user-789",
  "source": {
    "file": "/app/src/api/main.py",
    "line": 42,
    "function": "process_request"
  },
  "response_time_ms": 125.5,
  "status_code": 200
}
```

### Using Structured Logging

```python
from src.utils.structured_logging import get_logger, set_request_context

logger = get_logger(__name__)

# Set request context
set_request_context(request_id="req-123", user_id="user-456")

# Log with extra fields
logger.info("Processing forecast request", 
           location="Delhi", 
           forecast_hours=24)

logger.error("Prediction failed", 
            error_type="ModelError",
            model_name="ensemble")
```

### Log Levels

- **DEBUG** - Detailed diagnostic information
- **INFO** - General informational messages
- **WARNING** - Warning messages for potential issues
- **ERROR** - Error messages for failures
- **CRITICAL** - Critical issues requiring immediate attention

## Alerting

### Alert Configuration

Alerts are configured in `docker/prometheus/alert_rules.yml`.

### Alert Types

**System Alerts:**
- High CPU usage (>90%)
- High memory usage (>90%)
- High disk usage (>85%)
- Critical disk usage (>95%)

**API Alerts:**
- High error rate (>5%)
- Slow API responses (p95 >1s)
- Very slow responses (p95 >2s)

**ML Model Alerts:**
- Model RMSE degraded (>25)
- Model accuracy low (<70%)
- High prediction errors

**Data Pipeline Alerts:**
- Data ingestion failures
- High data quality issues
- Celery task failures

**Cache Alerts:**
- Low cache hit rate (<50%)

**Database Alerts:**
- High database connections (>80)
- Slow database queries (p95 >1s)

### Alert Channels

Alerts can be sent through multiple channels:

1. **Email** - SMTP-based email notifications
2. **Slack** - Webhook-based Slack messages
3. **Logs** - Application log entries

### Configuring Alerts

**Environment Variables:**
```bash
# Email alerts
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=your_password
ALERT_FROM_EMAIL=alerts@aqi-predictor.com
ALERT_TO_EMAILS=admin@example.com,ops@example.com

# Slack alerts
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Alert cooldown
ALERT_COOLDOWN_MINUTES=60
```

### Sending Custom Alerts

```python
from src.utils.alerting import send_system_alert, AlertSeverity

await send_system_alert(
    title="High Memory Usage",
    message="Memory usage exceeded 90%",
    severity=AlertSeverity.CRITICAL,
    component="system",
    metric="memory_percent",
    current_value=92.5,
    threshold=90.0
)
```

## Uptime Monitoring

### SLA Tracking

The system tracks uptime and SLA compliance with a default target of 99.5% availability.

### Accessing Uptime Metrics

**API Endpoint:**
```
GET /api/v1/monitoring/uptime
```

**Response:**
```json
{
  "status": "up",
  "uptime_seconds": 86400,
  "service_start_time": "2024-01-15T00:00:00Z",
  "sla_metrics": {
    "period_start": "2024-01-14T00:00:00Z",
    "period_end": "2024-01-15T00:00:00Z",
    "uptime_percent": 99.8,
    "downtime_minutes": 2.5,
    "sla_target": 99.5,
    "sla_met": true
  }
}
```

### SLA Configuration

```bash
# Uptime check interval
UPTIME_CHECK_INTERVAL=60

# SLA target percentage
SLA_TARGET_PERCENT=99.5

# Retention period
UPTIME_RETENTION_DAYS=90
```

## Health Checks

### Available Endpoints

1. **Basic Health:** `GET /health`
2. **Readiness:** `GET /health/ready`
3. **Liveness:** `GET /health/live`
4. **Startup:** `GET /health/startup`
5. **Detailed:** `GET /health/detailed`

### Kubernetes Integration

The health check endpoints are designed for Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/startup
    port: 8000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30
```

## Performance Monitoring

### API Performance Metrics

Access performance metrics through the monitoring API:

```
GET /api/v1/monitoring/summary
GET /api/v1/monitoring/requests?hours=1
GET /api/v1/monitoring/system?hours=6
GET /api/v1/monitoring/models?days=7
```

### Performance Thresholds

- **API Response Time (p95):** <500ms
- **API Response Time (p99):** <1000ms
- **Error Rate:** <1%
- **Cache Hit Rate:** >80%
- **Database Query Time (p95):** <100ms

## Troubleshooting

### Common Issues

**1. Metrics Not Appearing in Prometheus**
- Check if API is exposing `/metrics` endpoint
- Verify Prometheus scrape configuration
- Check network connectivity between services

**2. Grafana Dashboards Not Loading**
- Verify Prometheus datasource configuration
- Check dashboard JSON syntax
- Ensure Grafana has access to Prometheus

**3. Traces Not Appearing in Jaeger**
- Verify OTLP_ENDPOINT environment variable
- Check Jaeger collector is running
- Ensure OpenTelemetry instrumentation is enabled

**4. Alerts Not Being Sent**
- Check alert rule syntax in Prometheus
- Verify alert channel configuration
- Check alert cooldown settings

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Prometheus alerts
curl http://localhost:9090/api/v1/alerts

# Test metrics endpoint
curl http://localhost:8000/metrics

# Check health status
curl http://localhost:8000/health/detailed

# View logs
docker logs aqi-api
docker logs aqi-prometheus
docker logs aqi-grafana
```

## Best Practices

1. **Metrics:**
   - Use appropriate metric types (Counter, Gauge, Histogram)
   - Add meaningful labels for filtering
   - Avoid high-cardinality labels
   - Set reasonable histogram buckets

2. **Tracing:**
   - Trace critical paths and external calls
   - Add relevant attributes to spans
   - Use consistent naming conventions
   - Avoid tracing high-frequency operations

3. **Logging:**
   - Use appropriate log levels
   - Include context in log messages
   - Avoid logging sensitive information
   - Use structured fields for filtering

4. **Alerting:**
   - Set appropriate thresholds
   - Use alert cooldowns to prevent spam
   - Include actionable information in alerts
   - Test alert delivery regularly

## Maintenance

### Regular Tasks

1. **Daily:**
   - Review critical alerts
   - Check SLA compliance
   - Monitor error rates

2. **Weekly:**
   - Review dashboard metrics
   - Analyze performance trends
   - Update alert thresholds if needed

3. **Monthly:**
   - Clean up old metrics data
   - Review and update dashboards
   - Audit alert configurations
   - Generate SLA reports

### Data Retention

- **Prometheus:** 15 days (configurable)
- **Jaeger:** 7 days (configurable)
- **Logs:** 30 days (configurable)
- **Uptime Records:** 90 days

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
