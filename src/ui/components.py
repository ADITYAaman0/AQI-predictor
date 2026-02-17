"""
UI Components - Reusable Streamlit components with glassmorphism styling
"""

import streamlit as st
from typing import Dict, List, Optional, Any
from datetime import datetime

from ..utils.constants import POLLUTANTS, HEALTH_RECOMMENDATIONS, AQI_COLORS
from ..utils.aqi_calculator import AQICalculator
from .styles import get_aqi_gauge_html


def render_aqi_gauge(aqi: int, category: str, city: str = "Delhi") -> None:
    """
    Render the main AQI gauge display
    
    Args:
        aqi: Current AQI value
        category: AQI category key
        city: City name
    """
    calc = AQICalculator()
    color = calc.get_color(aqi)
    label = calc.get_category_label(aqi)
    
    # Render gauge HTML
    gauge_html = get_aqi_gauge_html(aqi, label, color)
    st.markdown(gauge_html, unsafe_allow_html=True)
    
    # Location and timestamp
    st.markdown(f'''
    <div style="text-align: center; color: rgba(255,255,255,0.7); font-size: 14px;">
        📍 {city} &nbsp;|&nbsp; 🕐 Updated: {datetime.now().strftime("%I:%M %p")}
    </div>
    ''', unsafe_allow_html=True)


def render_pollutant_card(name: str, value: float, unit: str, 
                          icon: str, color: str = None) -> None:
    """
    Render a single pollutant metric card
    
    Args:
        name: Pollutant display name
        value: Concentration value
        unit: Measurement unit
        icon: Emoji icon
        color: Optional highlight color
    """
    # Calculate severity for progress bar
    calc = AQICalculator()
    pollutant_key = name.lower().replace('.', '').replace('₂', '2').replace('₃', '3')
    
    try:
        sub_index = calc.calculate_sub_index(value, pollutant_key)
        progress = min(100, (sub_index / 200) * 100)
        bar_color = calc.get_color(sub_index)
    except:
        progress = 50
        bar_color = "#FCD34D"
    
    if color:
        bar_color = color
    
    st.markdown(f'''
    <div class="pollutant-card">
        <div class="pollutant-icon">{icon}</div>
        <div class="pollutant-name">{name}</div>
        <div class="pollutant-value" style="color: {bar_color};">{value:.1f}</div>
        <div class="pollutant-unit">{unit}</div>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: {progress}%; background: {bar_color};"></div>
        </div>
    </div>
    ''', unsafe_allow_html=True)


def render_pollutant_grid(pollutants: Dict[str, float]) -> None:
    """
    Render grid of pollutant cards
    
    Args:
        pollutants: Dictionary of pollutant values
    """
    cols = st.columns(3)
    
    pollutant_info = [
        ('pm25', 'PM2.5', 'μg/m³', '🔴'),
        ('pm10', 'PM10', 'μg/m³', '🟠'),
        ('o3', 'O₃', 'ppb', '🟡'),
        ('no2', 'NO₂', 'ppb', '🟤'),
        ('so2', 'SO₂', 'ppb', '🟣'),
        ('co', 'CO', 'ppm', '⚫')
    ]
    
    for i, (key, name, unit, icon) in enumerate(pollutant_info):
        value = pollutants.get(key, 0)
        with cols[i % 3]:
            render_pollutant_card(name, value, unit, icon)


def render_weather_badges(weather: Dict[str, Any]) -> None:
    """
    Render weather condition badges
    
    Args:
        weather: Weather data dictionary
    """
    badges_html = '<div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 12px;">'
    
    weather_items = [
        ('🌡️', f"{weather.get('temperature', 25):.0f}°C", 'Temp'),
        ('💨', f"{weather.get('wind_speed', 0):.1f} m/s", 'Wind'),
        ('💧', f"{weather.get('humidity', 50)}%", 'Humidity'),
        ('🌡️', f"{weather.get('pressure', 1013)} hPa", 'Pressure')
    ]
    
    for icon, value, label in weather_items:
        badges_html += f'''
        <div class="weather-badge" title="{label}">
            <div class="weather-badge-icon">{icon}</div>
            <div class="weather-badge-value">{value}</div>
        </div>
        '''
    
    badges_html += '</div>'
    st.markdown(badges_html, unsafe_allow_html=True)


def render_health_card(aqi: int, category: str) -> None:
    """
    Render health recommendations card
    
    Args:
        aqi: Current AQI value
        category: AQI category key
    """
    recommendations = HEALTH_RECOMMENDATIONS.get(category, HEALTH_RECOMMENDATIONS['moderate'])
    
    # Determine card styling based on severity
    if category in ['hazardous', 'very_unhealthy']:
        border_class = 'health-card-hazardous'
        icon = '⚠️'
        title = 'Health Alert'
    elif category == 'unhealthy':
        border_class = 'health-card-unhealthy'
        icon = '🏥'
        title = 'Health Advisory'
    elif category == 'moderate' or category == 'unhealthy_sensitive':
        border_class = 'health-card-moderate'
        icon = '💡'
        title = 'Health Tips'
    else:
        border_class = 'health-card-good'
        icon = '✅'
        title = 'Good Air Day!'
    
    recs_html = ''.join([f'<li style="margin: 8px 0;">{rec}</li>' for rec in recommendations])
    
    st.markdown(f'''
    <div class="health-card {border_class}">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">{icon}</span>
            {title}
        </h3>
        <ul style="margin: 0; padding-left: 24px; color: rgba(255,255,255,0.9);">
            {recs_html}
        </ul>
    </div>
    ''', unsafe_allow_html=True)


def render_source_attribution(attribution: Dict) -> None:
    """
    Render source attribution breakdown
    
    Args:
        attribution: Attribution result from SourceAttributor
    """
    st.markdown('''
    <div class="section-header">
        <span class="section-header-icon">📊</span>
        Pollution Sources
    </div>
    ''', unsafe_allow_html=True)
    
    sources = attribution.get('sources', [])
    
    for source in sources:
        pct = source['percentage']
        color = source['color']
        icon = source['icon']
        name = source['name']
        desc = source.get('description', '')
        
        st.markdown(f'''
        <div class="glass-card" style="padding: 16px; margin: 8px 0;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px;">{icon}</span>
                    <div>
                        <div style="font-weight: 600; font-size: 16px;">{name}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.7);">{desc}</div>
                    </div>
                </div>
                <div style="font-size: 24px; font-weight: 700; color: {color};">
                    {pct:.0f}%
                </div>
            </div>
            <div class="progress-bar" style="margin-top: 12px;">
                <div class="progress-bar-fill" style="width: {pct}%; background: {color};"></div>
            </div>
        </div>
        ''', unsafe_allow_html=True)


def render_stat_card(value: str, label: str, icon: str, color: str = None) -> None:
    """
    Render a statistics card
    
    Args:
        value: Main value to display
        label: Label text
        icon: Emoji icon
        color: Optional accent color
    """
    color = color or '#4ADE80'
    
    st.markdown(f'''
    <div class="glass-card" style="text-align: center; padding: 20px;">
        <div style="font-size: 28px; margin-bottom: 8px;">{icon}</div>
        <div style="font-size: 32px; font-weight: 700; color: {color};">{value}</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">{label}</div>
    </div>
    ''', unsafe_allow_html=True)


def render_forecast_summary(forecasts: List[Dict]) -> None:
    """
    Render summary of forecast (best/worst hours)
    
    Args:
        forecasts: List of hourly forecast dictionaries
    """
    if not forecasts:
        return
    
    # Find best and worst hours
    sorted_forecasts = sorted(forecasts, key=lambda x: x['aqi'])
    best = sorted_forecasts[0]
    worst = sorted_forecasts[-1]
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f'''
        <div class="glass-card" style="text-align: center; border-left: 4px solid {best['color']};">
            <div style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Best Time</div>
            <div style="font-size: 20px; font-weight: 600;">{best['timestamp'].strftime('%I %p')}</div>
            <div style="font-size: 28px; font-weight: 700; color: {best['color']};">AQI {best['aqi']}</div>
            <div style="font-size: 12px; color: {best['color']};">{best['category_label']}</div>
        </div>
        ''', unsafe_allow_html=True)
    
    with col2:
        st.markdown(f'''
        <div class="glass-card" style="text-align: center; border-left: 4px solid {worst['color']};">
            <div style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Peak Pollution</div>
            <div style="font-size: 20px; font-weight: 600;">{worst['timestamp'].strftime('%I %p')}</div>
            <div style="font-size: 28px; font-weight: 700; color: {worst['color']};">AQI {worst['aqi']}</div>
            <div style="font-size: 12px; color: {worst['color']};">{worst['category_label']}</div>
        </div>
        ''', unsafe_allow_html=True)


def render_city_selector(cities: List[str], current: str) -> str:
    """
    Render city selection dropdown
    
    Args:
        cities: List of available cities
        current: Currently selected city
        
    Returns:
        Selected city name
    """
    return st.selectbox(
        "📍 Select City",
        cities,
        index=cities.index(current) if current in cities else 0,
        key="city_selector"
    )


def render_alert_banner(message: str, level: str = 'warning') -> None:
    """
    Render an alert banner
    
    Args:
        message: Alert message
        level: 'info', 'warning', 'error', 'success'
    """
    colors = {
        'info': '#3B82F6',
        'warning': '#F59E0B',
        'error': '#EF4444',
        'success': '#10B981'
    }
    
    icons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '🚨',
        'success': '✅'
    }
    
    color = colors.get(level, colors['warning'])
    icon = icons.get(level, icons['warning'])
    
    st.markdown(f'''
    <div style="background: {color}22; border: 1px solid {color}; border-radius: 8px; padding: 12px 16px; margin: 8px 0; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 20px;">{icon}</span>
        <span style="color: {color}; font-weight: 500;">{message}</span>
    </div>
    ''', unsafe_allow_html=True)
