"""
Streamlit Demo - Standalone Dashboard Demo
This demonstrates the dashboard UI without requiring backend services
"""

import streamlit as st
from datetime import datetime
import random

# Page configuration
st.set_page_config(
    page_title="AQI Predictor - Demo",
    page_icon="🌬️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Mock data
CITIES = ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Chennai", "Hyderabad"]
AQI_CATEGORIES = {
    "good": {"range": (0, 50), "color": "#00E400", "label": "Good"},
    "moderate": {"range": (51, 100), "color": "#FFFF00", "label": "Moderate"},
    "unhealthy_sensitive": {"range": (101, 150), "color": "#FF7E00", "label": "Unhealthy for Sensitive Groups"},
    "unhealthy": {"range": (151, 200), "color": "#FF0000", "label": "Unhealthy"},
    "very_unhealthy": {"range": (201, 300), "color": "#8F3F97", "label": "Very Unhealthy"},
    "hazardous": {"range": (301, 500), "color": "#7E0023", "label": "Hazardous"}
}

def get_aqi_category(aqi):
    """Get AQI category based on value"""
    for category, data in AQI_CATEGORIES.items():
        if data["range"][0] <= aqi <= data["range"][1]:
            return category, data
    return "hazardous", AQI_CATEGORIES["hazardous"]

def generate_mock_data(city):
    """Generate mock AQI data for demonstration"""
    # Generate realistic AQI values based on city
    city_base = {
        "Delhi": 150,
        "Mumbai": 120,
        "Bangalore": 80,
        "Kolkata": 140,
        "Chennai": 90,
        "Hyderabad": 100
    }
    
    base_aqi = city_base.get(city, 100)
    aqi = base_aqi + random.randint(-20, 20)
    
    category, cat_data = get_aqi_category(aqi)
    
    return {
        "aqi": aqi,
        "category": cat_data["label"],
        "color": cat_data["color"],
        "pm25": round(aqi * 0.6, 1),
        "pm10": round(aqi * 0.8, 1),
        "no2": round(random.uniform(20, 80), 1),
        "so2": round(random.uniform(5, 30), 1),
        "co": round(random.uniform(0.5, 2.5), 2),
        "o3": round(random.uniform(30, 100), 1),
        "temp": round(random.uniform(20, 35), 1),
        "humidity": round(random.uniform(40, 80), 0),
        "wind_speed": round(random.uniform(2, 15), 1)
    }

def main():
    """Main demo application"""
    
    st.markdown("""
    <style>
    .main-header {
        text-align: center;
        padding: 2rem 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        margin: 1rem 0;
    }
    .aqi-display {
        font-size: 4rem;
        font-weight: bold;
        text-align: center;
        padding: 2rem;
        border-radius: 10px;
        color: white;
    }
    .pollutant-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown("""
    <div class="main-header">
        <h1>🌬️ AQI Predictor Demo</h1>
        <p>Air Quality Forecasting Dashboard</p>
        <p style="font-size: 0.9rem; opacity: 0.9;">⚠️ Demo Mode - Using Mock Data</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.markdown("### 📍 Select City")
        city = st.selectbox("", CITIES, label_visibility="collapsed")
        
        st.markdown("---")
        st.markdown("### 🎯 Features")
        st.markdown("""
        - 📊 Real-time AQI Monitoring
        - 🔮 24-hour Forecasting
        - 🗺️ Spatial Coverage Maps
        - 📈 Historical Analysis
        - ⚠️ Health Recommendations
        - 🔔 Alert System
        """)
        
        st.markdown("---")
        st.markdown("### ℹ️ About")
        st.info(
            "This is a demo of the AQI Predictor dashboard. "
            "For full functionality with real data, deploy using Docker Compose."
        )
        
        st.markdown("---")
        st.markdown(f"**Last Updated:** {datetime.now().strftime('%I:%M %p')}")
    
    # Generate mock data
    data = generate_mock_data(city)
    
    # Main content
    col1, col2, col3 = st.columns([2, 2, 1])
    
    with col1:
        # AQI Display
        st.markdown(f"""
        <div class="aqi-display" style="background-color: {data['color']}">
            {data['aqi']}
            <div style="font-size: 1.5rem;">AQI</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("### 📊 Current Status")
        st.markdown(f"**Category:** {data['category']}")
        st.markdown(f"**Location:** {city}")
        st.markdown(f"**Time:** {datetime.now().strftime('%B %d, %Y %I:%M %p')}")
        
        if data['aqi'] > 100:
            st.warning("⚠️ Sensitive groups should limit outdoor activities")
        elif data['aqi'] > 150:
            st.error("🚨 Everyone should limit outdoor exposure")
        else:
            st.success("✓ Air quality is acceptable")
    
    with col3:
        st.markdown("### 🌡️ Weather")
        st.metric("Temperature", f"{data['temp']}°C")
        st.metric("Humidity", f"{data['humidity']}%")
        st.metric("Wind", f"{data['wind_speed']} m/s")
    
    # Pollutants
    st.markdown("---")
    st.markdown("### 💨 Pollutant Levels")
    
    cols = st.columns(6)
    pollutants = [
        ("PM2.5", data['pm25'], "µg/m³"),
        ("PM10", data['pm10'], "µg/m³"),
        ("NO₂", data['no2'], "ppb"),
        ("SO₂", data['so2'], "ppb"),
        ("CO", data['co'], "ppm"),
        ("O₃", data['o3'], "ppb")
    ]
    
    for col, (name, value, unit) in zip(cols, pollutants):
        with col:
            st.metric(name, f"{value} {unit}")
    
    # Forecast Chart st.markdown("---")
    st.markdown("### 📈 24-Hour Forecast")
    
    import pandas as pd
    import numpy as np
    
    # Generate mock forecast data
    hours = list(range(24))
    forecast_values = [data['aqi'] + random.randint(-15, 15) for _ in hours]
    
    chart_data = pd.DataFrame({
        'Hour': hours,
        'AQI': forecast_values
    })
    
    st.line_chart(chart_data.set_index('Hour'))
    
    # Health Recommendations
    st.markdown("---")
    st.markdown("### 💡 Health Recommendations")
    
    if data['aqi'] <= 50:
        st.success("""
        ✓ **Air quality is good!**
        - Perfect for outdoor activities
        - No health concerns
        """)
    elif data['aqi'] <= 100:
        st.info("""
        ℹ️ **Air quality is moderate**
        - Acceptable for most people
        - Unusually sensitive people should limit prolonged outdoor exertion
        """)
    elif data['aqi'] <= 150:
        st.warning("""
        ⚠️ **Unhealthy for sensitive groups**
        - People with respiratory or heart conditions should limit outdoor activities
        - Children and older adults should reduce prolonged exertion
        """)
    else:
        st.error("""
        🚨 **Unhealthy air quality**
        - Everyone should limit outdoor activities
        - Vulnerable groups should stay indoors
        - Use air purifiers if available
        """)
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.9rem;">
        <p>🌬️ AQI Predictor - Air Quality Forecasting System</p>
        <p>Demo Mode | For full deployment instructions, see DEPLOYMENT_GUIDE.md</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
