"""
Spatial Visualization Components for Streamlit Dashboard
Provides interactive heatmaps and spatial analysis tools.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def create_spatial_heatmap(grid_data: List[Dict[str, Any]], title: str = "Air Quality Heatmap") -> go.Figure:
    """
    Create interactive spatial heatmap from grid predictions.
    
    Args:
        grid_data: List of grid predictions with coordinates and AQI values
        title: Chart title
        
    Returns:
        Plotly figure object
    """
    if not grid_data:
        # Return empty figure
        fig = go.Figure()
        fig.add_annotation(
            text="No spatial data available",
            xref="paper", yref="paper",
            x=0.5, y=0.5, showarrow=False,
            font=dict(size=16, color="gray")
        )
        return fig
    
    # Extract data
    lats = [point['coordinates']['lat'] for point in grid_data]
    lons = [point['coordinates']['lon'] for point in grid_data]
    aqi_values = [point['aqi'] for point in grid_data]
    categories = [point.get('category_label', 'Unknown') for point in grid_data]
    
    # Create DataFrame
    df = pd.DataFrame({
        'lat': lats,
        'lon': lons,
        'aqi': aqi_values,
        'category': categories
    })
    
    # Create heatmap using density mapbox
    fig = go.Figure(go.Densitymapbox(
        lat=df['lat'],
        lon=df['lon'],
        z=df['aqi'],
        radius=15,
        colorscale=[
            [0, '#00E400'],      # Good (0-50)
            [0.17, '#FFFF00'],   # Moderate (51-100)
            [0.33, '#FF7E00'],   # Unhealthy for Sensitive (101-150)
            [0.5, '#FF0000'],    # Unhealthy (151-200)
            [0.67, '#8F3F97'],   # Very Unhealthy (201-300)
            [1, '#7E0023']       # Hazardous (301+)
        ],
        zmin=0,
        zmax=300,
        colorbar=dict(
            title="AQI",
            thickness=15,
            len=0.7,
            x=1.02
        ),
        hovertemplate='<b>AQI: %{z:.0f}</b><br>Lat: %{lat:.4f}<br>Lon: %{lon:.4f}<extra></extra>'
    ))
    
    # Update layout
    fig.update_layout(
        title=title,
        mapbox=dict(
            style='open-street-map',
            center=dict(lat=df['lat'].mean(), lon=df['lon'].mean()),
            zoom=10
        ),
        height=600,
        margin=dict(l=0, r=0, t=40, b=0)
    )
    
    return fig


def create_contour_map(grid_data: List[Dict[str, Any]], parameter: str = "pm25") -> go.Figure:
    """
    Create contour map for pollutant concentration.
    
    Args:
        grid_data: List of grid predictions
        parameter: Pollutant parameter to visualize
        
    Returns:
        Plotly figure object
    """
    if not grid_data:
        fig = go.Figure()
        fig.add_annotation(
            text="No data available",
            xref="paper", yref="paper",
            x=0.5, y=0.5, showarrow=False
        )
        return fig
    
    # Extract data
    lats = [point['coordinates']['lat'] for point in grid_data]
    lons = [point['coordinates']['lon'] for point in grid_data]
    values = [point.get(parameter, point.get('aqi', 0)) for point in grid_data]
    
    # Create contour map
    fig = go.Figure(go.Scattermapbox(
        lat=lats,
        lon=lons,
        mode='markers',
        marker=dict(
            size=10,
            color=values,
            colorscale='RdYlGn_r',
            showscale=True,
            colorbar=dict(title=parameter.upper())
        ),
        text=[f"{parameter.upper()}: {v:.1f}" for v in values],
        hoverinfo='text'
    ))
    
    fig.update_layout(
        mapbox=dict(
            style='open-street-map',
            center=dict(lat=np.mean(lats), lon=np.mean(lons)),
            zoom=10
        ),
        height=600,
        margin=dict(l=0, r=0, t=0, b=0)
    )
    
    return fig


def render_spatial_heatmap_viewer(api_client, location_name: str):
    """
    Render interactive spatial heatmap viewer component.
    
    Args:
        api_client: API client instance
        location_name: Name of location for bounds
    """
    st.markdown('''
    <div class="section-header">
        <span class="section-header-icon">🗺️</span>
        Interactive Spatial Heatmap
    </div>
    ''', unsafe_allow_html=True)
    
    # Configuration options
    col1, col2, col3 = st.columns(3)
    
    with col1:
        resolution = st.slider("Grid Resolution (km)", 0.5, 5.0, 1.0, 0.5)
    
    with col2:
        viz_type = st.selectbox("Visualization Type", ["Heatmap", "Contour", "Points"])
    
    with col3:
        parameter = st.selectbox("Parameter", ["AQI", "PM2.5", "PM10", "NO2"])
    
    # Define bounds based on location (simplified - would use city bounds in production)
    bounds_map = {
        'Delhi': {'north': 28.88, 'south': 28.40, 'east': 77.35, 'west': 76.85},
        'Mumbai': {'north': 19.27, 'south': 18.89, 'east': 72.98, 'west': 72.78},
        'Bangalore': {'north': 13.14, 'south': 12.83, 'east': 77.75, 'west': 77.45},
        'Chennai': {'north': 13.23, 'south': 12.83, 'east': 80.30, 'west': 80.10},
        'Kolkata': {'north': 22.73, 'south': 22.40, 'east': 88.50, 'west': 88.25}
    }
    
    bounds = bounds_map.get(location_name, bounds_map['Delhi'])
    
    # Fetch spatial data
    try:
        with st.spinner("Loading spatial data..."):
            spatial_data = api_client.get_spatial_forecast(
                north=bounds['north'],
                south=bounds['south'],
                east=bounds['east'],
                west=bounds['west'],
                resolution=resolution
            )
        
        grid_predictions = spatial_data.get('grid_predictions', [])
        metadata = spatial_data.get('metadata', {})
        stats = spatial_data.get('statistics', {})
        
        if grid_predictions:
            # Display statistics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Grid Points", metadata.get('grid_points', 0))
            with col2:
                st.metric("Min AQI", stats.get('min_aqi', 0))
            with col3:
                st.metric("Max AQI", stats.get('max_aqi', 0))
            with col4:
                st.metric("Mean AQI", stats.get('mean_aqi', 0))
            
            # Create visualization based on type
            if viz_type == "Heatmap":
                fig = create_spatial_heatmap(grid_predictions, f"{location_name} Air Quality Heatmap")
            elif viz_type == "Contour":
                param_key = parameter.lower().replace('.', '')
                fig = create_contour_map(grid_predictions, param_key)
            else:  # Points
                fig = create_point_map(grid_predictions)
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Additional info
            st.info(f"📊 Interpolation Method: {metadata.get('interpolation_method', 'Unknown')} | "
                   f"🔄 Update Frequency: {metadata.get('update_frequency', 'Unknown')} | "
                   f"📍 Stations Used: {metadata.get('stations_used', 0)}")
        else:
            st.warning("No spatial data available for this location.")
            
    except Exception as e:
        st.error(f"Failed to load spatial data: {str(e)}")
        logger.error(f"Spatial heatmap error: {e}")


def create_point_map(grid_data: List[Dict[str, Any]]) -> go.Figure:
    """
    Create point map with color-coded markers.
    
    Args:
        grid_data: List of grid predictions
        
    Returns:
        Plotly figure object
    """
    if not grid_data:
        return go.Figure()
    
    lats = [point['coordinates']['lat'] for point in grid_data]
    lons = [point['coordinates']['lon'] for point in grid_data]
    aqi_values = [point['aqi'] for point in grid_data]
    colors = [point.get('color', '#808080') for point in grid_data]
    labels = [point.get('category_label', 'Unknown') for point in grid_data]
    
    fig = go.Figure(go.Scattermapbox(
        lat=lats,
        lon=lons,
        mode='markers',
        marker=dict(
            size=12,
            color=aqi_values,
            colorscale='RdYlGn_r',
            showscale=True,
            colorbar=dict(title="AQI")
        ),
        text=[f"AQI: {aqi}<br>{label}" for aqi, label in zip(aqi_values, labels)],
        hoverinfo='text'
    ))
    
    fig.update_layout(
        mapbox=dict(
            style='open-street-map',
            center=dict(lat=np.mean(lats), lon=np.mean(lons)),
            zoom=10
        ),
        height=600,
        margin=dict(l=0, r=0, t=0, b=0)
    )
    
    return fig


def render_route_analysis(api_client, start_location: str, end_location: str):
    """
    Render route-based air quality analysis.
    
    Args:
        api_client: API client instance
        start_location: Starting location
        end_location: Ending location
    """
    st.markdown('''
    <div class="section-header">
        <span class="section-header-icon">🛣️</span>
        Route Air Quality Analysis
    </div>
    ''', unsafe_allow_html=True)
    
    st.info("🚧 Route analysis feature coming soon! This will show air quality along your route.")
    
    # Placeholder for route analysis
    col1, col2 = st.columns(2)
    with col1:
        st.text_input("Start Location", value=start_location, key="route_start")
    with col2:
        st.text_input("End Location", value=end_location, key="route_end")
    
    if st.button("Analyze Route"):
        st.warning("Route analysis will be available in the next update.")


def export_data_to_csv(data: List[Dict[str, Any]], filename: str = "aqi_data.csv") -> str:
    """
    Export data to CSV format.
    
    Args:
        data: List of data dictionaries
        filename: Output filename
        
    Returns:
        CSV string
    """
    df = pd.DataFrame(data)
    return df.to_csv(index=False)


def export_data_to_json(data: List[Dict[str, Any]]) -> str:
    """
    Export data to JSON format.
    
    Args:
        data: List of data dictionaries
        
    Returns:
        JSON string
    """
    import json
    return json.dumps(data, indent=2, default=str)


def render_data_export_panel(data: List[Dict[str, Any]], data_type: str = "forecast"):
    """
    Render data export panel with download options.
    
    Args:
        data: Data to export
        data_type: Type of data (forecast, historical, spatial)
    """
    st.markdown('''
    <div class="section-header">
        <span class="section-header-icon">💾</span>
        Export Data
    </div>
    ''', unsafe_allow_html=True)
    
    if not data:
        st.warning("No data available to export.")
        return
    
    col1, col2 = st.columns(2)
    
    with col1:
        # CSV Export
        csv_data = export_data_to_csv(data, f"{data_type}_data.csv")
        st.download_button(
            label="📄 Download CSV",
            data=csv_data,
            file_name=f"{data_type}_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    
    with col2:
        # JSON Export
        json_data = export_data_to_json(data)
        st.download_button(
            label="📋 Download JSON",
            data=json_data,
            file_name=f"{data_type}_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )
    
    st.info(f"📊 {len(data)} records available for export")
