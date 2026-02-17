# AQI Predictor - Air Quality Forecasting Platform

A beautiful, interactive air quality monitoring and forecasting dashboard for Delhi-NCR built with Streamlit. Features real-time AQI display, 24-hour predictions, source attribution, and health recommendations.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-1.30+-red.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Features

- **Real-time AQI Monitoring** - Live air quality data from OpenAQ stations
- **24-Hour Forecasting** - XGBoost-powered predictions with confidence intervals
- **Source Attribution** - SHAP-based pollution source breakdown (traffic, industry, biomass, background)
- **Health Recommendations** - Actionable advice based on current AQI levels
- **Multi-City Support** - Monitor Delhi, Mumbai, Bangalore, and more
- **Alert System** - Email notifications when AQI exceeds thresholds
- **Historical Data Browser** - Explore past AQI trends and patterns
- **Glassmorphism UI** - Modern, beautiful interface with dynamic backgrounds

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- pip package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aqi-predictor.git
   cd aqi-predictor
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenWeatherMap API key
   ```

5. **Run the application**
   ```bash
   streamlit run app.py
   ```

6. **Open in browser**
   Navigate to `http://localhost:8501`

## 🔑 API Keys

### OpenWeatherMap (Required for weather forecasts)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add to `.env` file: `OPENWEATHERMAP_API_KEY=your_key_here`

### OpenAQ (No key required)
The app uses the free OpenAQ API for AQI data - no registration needed.

## 📁 Project Structure

```
aqi-predictor/
├── .github/workflows/     # GitHub Actions CI/CD
├── .streamlit/            # Streamlit configuration
├── src/
│   ├── data/              # Data ingestion modules
│   │   ├── openaq_client.py
│   │   ├── weather_client.py
│   │   └── data_processor.py
│   ├── models/            # ML forecasting models
│   │   ├── forecaster.py
│   │   └── source_attribution.py
│   ├── ui/                # UI components
│   │   ├── components.py
│   │   ├── charts.py
│   │   └── styles.py
│   └── utils/             # Utility functions
│       ├── aqi_calculator.py
│       └── constants.py
├── assets/                # Static assets
├── tests/                 # Unit tests
├── app.py                 # Main Streamlit app
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template
└── README.md              # This file
```

## 🎨 UI Design

The dashboard features a modern glassmorphism design with:
- **Dynamic backgrounds** that change based on AQI level
- **Frosted glass cards** with blur effects
- **Color-coded AQI indicators** (Green → Maroon)
- **Responsive layout** for mobile and desktop

### AQI Color Scale
| AQI Range | Status | Color |
|-----------|--------|-------|
| 0-50 | Good | 🟢 Green |
| 51-100 | Moderate | 🟡 Yellow |
| 101-150 | Unhealthy for Sensitive | 🟠 Orange |
| 151-200 | Unhealthy | 🔴 Red |
| 201-300 | Very Unhealthy | 🟣 Purple |
| 301+ | Hazardous | 🟤 Maroon |

## 🧪 Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=html
```

## ☁️ Deploy to Streamlit Cloud

1. Push your code to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Click "New app" and select your repository
4. Set the main file path to `app.py`
5. Add secrets in the Streamlit dashboard:
   - `OPENWEATHERMAP_API_KEY`: Your API key

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENWEATHERMAP_API_KEY` | Yes | API key for weather data |
| `DEBUG` | No | Enable debug mode (default: false) |
| `DEFAULT_CITY` | No | Default city (default: Delhi) |
| `ALERT_EMAIL` | No | Email for AQI alerts |

### Streamlit Config

Edit `.streamlit/config.toml` to customize theme colors and server settings.

## 📊 Data Sources

- **Air Quality**: [OpenAQ](https://openaq.org/) - Real-time pollution data
- **Weather**: [OpenWeatherMap](https://openweathermap.org/) - Current conditions and forecasts
- **Predictions**: XGBoost model trained on historical data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Central Pollution Control Board (CPCB)](https://cpcb.nic.in/) for AQI guidelines
- [SAFAR](http://safar.tropmet.res.in/) for methodology inspiration
- [OpenAQ](https://openaq.org/) for providing free air quality data

---

Made with ❤️ for cleaner air
