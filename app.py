"""
AQI Predictor - Air Quality Forecasting Dashboard
Main Streamlit Application

Features:
- Real-time AQI monitoring for multiple cities
- 24-hour forecasting with confidence intervals
- Source attribution analysis
- Health recommendations
- Historical data browser
"""

import streamlit as st
from datetime import datetime, timedelta
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.ui.api_client import get_api_client, APIClientError, APIConnectionError, APIResponseError
from src.ui.styles import get_glassmorphism_css, get_dynamic_background
from src.ui.components import (
    render_aqi_gauge, render_pollutant_grid, render_weather_badges,
    render_health_card, render_source_attribution, render_forecast_summary,
    render_city_selector, render_alert_banner, render_stat_card
)
from src.ui.charts import (
    create_forecast_chart, create_attribution_chart, 
    create_pollutant_bars, create_historical_heatmap,
    create_weather_correlation_chart
)
from src.utils.constants import CITIES, HEALTH_RECOMMENDATIONS

# Page configuration
st.set_page_config(
    page_title="AQI Predictor - Air Quality Forecast",
    page_icon="🌬️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'city' not in st.session_state:
    st.session_state.city = 'Delhi'
if 'last_update' not in st.session_state:
    st.session_state.last_update = None
if 'api_error' not in st.session_state:
    st.session_state.api_error = None


def main():
    """Main application entry point"""
    
    # Get API client
    api_client = get_api_client()
    
    # Check API health
    if not api_client.health_check():
        st.error("⚠️ Unable to connect to API backend. Please ensure the API service is running.")
        st.info("Start the API with: `uvicorn src.api.main:app --reload`")
        return
    
    # Fetch current data from API
    try:
        current_data = api_client.get_current_forecast(st.session_state.city)
        st.session_state.api_error = None
    except APIConnectionError as e:
        st.error(f"🔌 Connection Error: {str(e)}")
        st.info("Please check that the API service is running and accessible.")
        return
    except APIResponseError as e:
        st.error(f"⚠️ API Error: {str(e)}")
        return
    except Exception as e:
        st.error(f"❌ Unexpected Error: {str(e)}")
        return
    
    # Extract data from API response
    aqi_data = current_data.get('aqi', {})
    aqi = aqi_data.get('value', 0)
    category = aqi_data.get('category', 'moderate')
    pollutants = current_data.get('pollutants', {})
    weather = current_data.get('weather', {})
    
    # Apply CSS styles
    st.markdown(get_glassmorphism_css(), unsafe_allow_html=True)
    st.markdown(get_dynamic_background(aqi), unsafe_allow_html=True)
    
    # Add mobile-responsive styles
    from src.ui.mobile_styles import get_mobile_responsive_css, get_touch_gestures_js, get_offline_support_js
    st.markdown(get_mobile_responsive_css(), unsafe_allow_html=True)
    st.markdown(get_touch_gestures_js(), unsafe_allow_html=True)
    st.markdown(get_offline_support_js(), unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.markdown('''
        <div style="text-align: center; padding: 20px 0;">
            <span style="font-size: 48px;">🌬️</span>
            <h1 style="margin: 10px 0; font-size: 24px;">AQI Predictor</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px;">Air Quality Forecasting</p>
        </div>
        ''', unsafe_allow_html=True)
        
        st.markdown("---")
        
        # City selector
        selected_city = st.selectbox(
            "📍 Select City",
            list(CITIES.keys()),
            index=list(CITIES.keys()).index(st.session_state.city)
        )
        
        if selected_city != st.session_state.city:
            st.session_state.city = selected_city
            st.rerun()
        
        st.markdown("---")
        
        # Navigation
        page = st.radio(
            "Navigation",
            ["🏠 Dashboard", "📈 Forecast", "🗺️ Spatial Map", "📊 Sources", "📚 History", "⚙️ Settings"],
            label_visibility="collapsed"
        )
        
        st.markdown("---")
        
        # Quick stats
        st.markdown("### 📊 Quick Stats")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Current AQI", aqi, delta=None)
        with col2:
            # Get station count from location data
            location_data = current_data.get('location', {})
            st.metric("Location", location_data.get('city', st.session_state.city)[:8])
        
        st.markdown("---")
        st.markdown(f'''
        <div style="text-align: center; font-size: 11px; color: rgba(255,255,255,0.5);">
            Last updated: {datetime.now().strftime("%I:%M %p")}<br>
            Data: OpenAQ | Weather: OpenWeatherMap
        </div>
        ''', unsafe_allow_html=True)
    
    # Main content area
    if "Dashboard" in page:
        render_dashboard(current_data, weather, pollutants, aqi, category, api_client)
    elif "Forecast" in page:
        render_forecast_page(current_data, api_client)
    elif "Spatial Map" in page:
        render_spatial_map_page(api_client)
    elif "Sources" in page:
        render_sources_page(pollutants, weather, api_client)
    elif "History" in page:
        render_history_page(api_client)
    elif "Settings" in page:
        render_settings_page(api_client)


def render_dashboard(current_data, weather, pollutants, aqi, category, api_client):
    """Render main dashboard page"""
    
    # Header with alert if needed
    aqi_data = current_data.get('aqi', {})
    if aqi >= 150:
        level = 'error' if aqi >= 200 else 'warning'
        health_message = aqi_data.get('health_message', 'Take precautions')
        render_alert_banner(
            f"Air quality is {aqi_data.get('category_label', 'unhealthy')}. {health_message}",
            level
        )
    
    # Main AQI display
    col1, col2 = st.columns([2, 3])
    
    with col1:
        render_aqi_gauge(aqi, category, st.session_state.city)
        
        # Weather badges
        st.markdown("<br>", unsafe_allow_html=True)
        render_weather_badges(weather)
    
    with col2:
        # Pollutant grid
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">💨</span>
            Current Pollutant Levels
        </div>
        ''', unsafe_allow_html=True)
        
        render_pollutant_grid(pollutants)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Forecast preview and health recommendations
    col1, col2 = st.columns([3, 2])
    
    with col1:
        # Quick forecast from API
        try:
            forecast_data = api_client.get_24h_forecast(st.session_state.city)
            forecasts = forecast_data.get('forecasts', [])
            
            st.markdown('''
            <div class="section-header">
                <span class="section-header-icon">📈</span>
                24-Hour Forecast
            </div>
            ''', unsafe_allow_html=True)
            
            fig = create_forecast_chart(forecasts)
            st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
            
            # Best/worst times
            render_forecast_summary(forecasts)
        except Exception as e:
            st.warning(f"Unable to load forecast: {str(e)}")
    
    with col2:
        # Health recommendations
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">🏥</span>
            Health Recommendations
        </div>
        ''', unsafe_allow_html=True)
        
        render_health_card(aqi, category)
        
        # Source attribution preview
        st.markdown("<br>", unsafe_allow_html=True)
        try:
            attribution_data = api_client.get_source_attribution(st.session_state.city)
            attribution = attribution_data.get('sources', {})
            
            fig = create_attribution_chart(attribution)
            st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
        except Exception as e:
            st.warning(f"Unable to load source attribution: {str(e)}")


def render_forecast_page(current_data, api_client):
    """Render detailed forecast page"""
    
    st.markdown('''
    <h1 style="text-align: center; margin-bottom: 32px;">
        📈 24-Hour AQI Forecast
    </h1>
    ''', unsafe_allow_html=True)
    
    # Generate forecast from API
    try:
        forecast_data = api_client.get_24h_forecast(st.session_state.city)
        forecasts = forecast_data.get('forecasts', [])
        
        # Forecast chart
        fig = create_forecast_chart(forecasts, show_confidence=True)
        st.plotly_chart(fig, use_container_width=True)
        
        # Summary cards
        render_forecast_summary(forecasts)
        
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Weather correlation
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">🌤️</span>
            Weather Impact Analysis
        </div>
        ''', unsafe_allow_html=True)
        
        fig = create_weather_correlation_chart(forecasts)
        st.plotly_chart(fig, use_container_width=True)
        
        # Hourly breakdown table
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">⏰</span>
            Hourly Breakdown
        </div>
        ''', unsafe_allow_html=True)
        
        # Create table data
        table_data = []
        for f in forecasts[:12]:  # First 12 hours
            aqi_info = f.get('aqi', {})
            weather_info = f.get('weather', {})
            pollutants = f.get('pollutants', {})
            pm25_data = pollutants.get('pm25', {})
            
            # Parse timestamp
            timestamp = f.get('timestamp', '')
            if isinstance(timestamp, str):
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    time_str = dt.strftime('%I %p')
                except:
                    time_str = timestamp[:5]
            else:
                time_str = str(timestamp)
            
            table_data.append({
                'Time': time_str,
                'AQI': aqi_info.get('value', 0),
                'PM2.5': f'{pm25_data.get("value", 0):.0f} μg/m³',
                'Status': aqi_info.get('category_label', 'Unknown'),
                'Temp': f'{weather_info.get("temperature", 0):.0f}°C',
                'Wind': f'{weather_info.get("wind_speed", 0):.1f} m/s'
            })
        
        st.dataframe(table_data, use_container_width=True, hide_index=True)
        
        # Data export
        st.markdown("<br>", unsafe_allow_html=True)
        from src.ui.spatial_viz import render_data_export_panel
        render_data_export_panel(forecasts, "forecast")
        
    except Exception as e:
        st.error(f"Unable to load forecast: {str(e)}")
        st.info("Please check API connection and try again.")


def render_sources_page(pollutants, weather, api_client):
    """Render source attribution page"""
    
    st.markdown('''
    <h1 style="text-align: center; margin-bottom: 32px;">
        📊 Pollution Source Attribution
    </h1>
    ''', unsafe_allow_html=True)
    
    # Calculate attribution from API
    try:
        attribution_data = api_client.get_source_attribution(st.session_state.city)
        attribution = attribution_data.get('sources', {})
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Donut chart
            fig = create_attribution_chart(attribution)
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Source details
            render_source_attribution(attribution)
        
        # Pollutant comparison
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">📉</span>
            Pollutant Analysis
        </div>
        ''', unsafe_allow_html=True)
        
        fig = create_pollutant_bars(pollutants)
        st.plotly_chart(fig, use_container_width=True)
        
        # Mitigation recommendations
        st.markdown('''
        <div class="section-header">
            <span class="section-header-icon">💡</span>
            Mitigation Actions
        </div>
        ''', unsafe_allow_html=True)
        
        # Generate recommendations based on dominant source
        recommendations = []
        if attribution:
            dominant_source = max(attribution.items(), key=lambda x: x[1])[0]
            
            if dominant_source == 'vehicular':
                recommendations = [
                    "🚗 Promote public transportation and carpooling",
                    "🚴 Develop cycling infrastructure and pedestrian zones",
                    "⚡ Incentivize electric vehicle adoption",
                    "🚦 Implement traffic management and congestion pricing"
                ]
            elif dominant_source == 'industrial':
                recommendations = [
                    "🏭 Enforce stricter emission standards for industries",
                    "♻️ Promote cleaner production technologies",
                    "📊 Implement continuous emission monitoring systems",
                    "🌱 Encourage relocation of polluting industries"
                ]
            elif dominant_source == 'biomass':
                recommendations = [
                    "🔥 Ban agricultural waste burning",
                    "🌾 Provide alternatives for crop residue management",
                    "🏘️ Regulate residential biomass burning",
                    "💰 Offer subsidies for cleaner cooking fuels"
                ]
            else:
                recommendations = [
                    "🌍 Regional cooperation for pollution control",
                    "🌳 Increase green cover and urban forests",
                    "📡 Enhance air quality monitoring network",
                    "📢 Public awareness campaigns"
                ]
        
        for rec in recommendations:
            st.markdown(f'''
            <div class="glass-card" style="padding: 12px 16px; margin: 8px 0;">
                {rec}
            </div>
            ''', unsafe_allow_html=True)
            
    except Exception as e:
        st.error(f"Unable to load source attribution: {str(e)}")
        st.info("Please check API connection and try again.")


def render_history_page(api_client):
    """Render historical data browser page"""
    
    st.markdown('''
    <h1 style="text-align: center; margin-bottom: 32px;">
        📚 Historical Data Analysis
    </h1>
    ''', unsafe_allow_html=True)
    
    # Import historical analysis components
    from src.ui.historical_analysis import render_historical_analysis_panel
    
    # Render comprehensive historical analysis
    render_historical_analysis_panel(api_client, st.session_state.city)


def render_settings_page(api_client):
    """Render settings page"""
    
    st.markdown('''
    <h1 style="text-align: center; margin-bottom: 32px;">
        ⚙️ Settings
    </h1>
    ''', unsafe_allow_html=True)
    
    st.markdown('''
    <div class="glass-card">
        <h3>🔔 Alert Settings</h3>
    </div>
    ''', unsafe_allow_html=True)
    
    with st.form("alert_settings"):
        alert_threshold = st.slider("Alert when AQI exceeds", 50, 300, 150)
        alert_email = st.text_input("Email for alerts (optional)")
        
        col1, col2 = st.columns(2)
        with col1:
            enable_push = st.checkbox("Enable browser notifications", value=True)
        with col2:
            enable_email = st.checkbox("Enable email alerts", value=False)
        
        submitted = st.form_submit_button("Save Settings")
        if submitted:
            try:
                # Create alert subscription via API
                channels = []
                if enable_push:
                    channels.append("push")
                if enable_email and alert_email:
                    channels.append("email")
                
                if channels:
                    result = api_client.create_alert_subscription(
                        location=st.session_state.city,
                        threshold=alert_threshold,
                        channels=channels,
                        email=alert_email if enable_email else None
                    )
                    st.success("Settings saved successfully!")
                else:
                    st.warning("Please enable at least one notification channel.")
            except Exception as e:
                st.error(f"Failed to save settings: {str(e)}")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown('''
    <div class="glass-card">
        <h3>🎨 Display Preferences</h3>
    </div>
    ''', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        temp_unit = st.selectbox("Temperature unit", ["Celsius (°C)", "Fahrenheit (°F)"])
    with col2:
        time_format = st.selectbox("Time format", ["12-hour", "24-hour"])
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown('''
    <div class="glass-card">
        <h3>📊 Data Sources</h3>
        <ul style="color: rgba(255,255,255,0.8);">
            <li><strong>Air Quality:</strong> CPCB, OpenAQ (public domain)</li>
            <li><strong>Weather:</strong> IMD, OpenWeatherMap API</li>
            <li><strong>Predictions:</strong> Ensemble ML Model (XGBoost + LSTM + GNN)</li>
            <li><strong>Backend:</strong> FastAPI Service</li>
        </ul>
    </div>
    ''', unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # API Status
    st.markdown('''
    <div class="glass-card">
        <h3>🔌 API Status</h3>
    </div>
    ''', unsafe_allow_html=True)
    
    try:
        api_info = api_client.get_api_info()
        col1, col2 = st.columns(2)
        with col1:
            st.metric("API Status", "✅ Connected")
            st.metric("Version", api_info.get('version', 'Unknown'))
        with col2:
            st.metric("Environment", api_info.get('environment', 'Unknown'))
            features = api_info.get('features', [])
            st.metric("Features", len(features))
    except Exception as e:
        st.error(f"⚠️ API Connection Error: {str(e)}")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown('''
    <div class="glass-card">
        <h3>ℹ️ About</h3>
        <p style="color: rgba(255,255,255,0.8);">
            AQI Predictor v2.0<br>
            Built with Streamlit, FastAPI, and ❤️<br><br>
            For cleaner air and healthier communities.
        </p>
    </div>
    ''', unsafe_allow_html=True)


if __name__ == "__main__":
    main()



def render_spatial_map_page(api_client):
    """Render spatial heatmap page with interactive maps"""
    
    st.markdown('''
    <h1 style="text-align: center; margin-bottom: 32px;">
        🗺️ Spatial Air Quality Map
    </h1>
    ''', unsafe_allow_html=True)
    
    # Import spatial visualization components
    from src.ui.spatial_viz import render_spatial_heatmap_viewer, render_route_analysis
    
    # Spatial heatmap viewer
    render_spatial_heatmap_viewer(api_client, st.session_state.city)
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    # Route analysis (placeholder)
    render_route_analysis(api_client, st.session_state.city, "Nearby Location")
