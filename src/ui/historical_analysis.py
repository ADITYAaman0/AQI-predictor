"""
Historical Data Analysis Components for Streamlit Dashboard
Provides trend analysis and historical data visualization.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def create_trend_chart(historical_data: List[Dict[str, Any]], parameter: str = "pm25") -> go.Figure:
    """
    Create trend chart for historical data.
    
    Args:
        historical_data: List of historical data points
        parameter: Parameter to visualize
        
    Returns:
        Plotly figure object
    """
    if not historical_data:
        fig = go.Figure()
        fig.add_annotation(
            text="No historical data available",
            xref="paper", yref="paper",
            x=0.5, y=0.5, showarrow=False
        )
        return fig
    
    # Convert to DataFrame
    df = pd.DataFrame(historical_data)
    
    # Ensure timestamp column
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    elif 'time' in df.columns:
        df['timestamp'] = pd.to_datetime(df['time'])
    else:
        df['timestamp'] = pd.date_range(start=datetime.now() - timedelta(days=len(df)), periods=len(df), freq='H')
    
    # Get parameter values
    if parameter in df.columns:
        values = df[parameter]
    elif 'value' in df.columns:
        values = df['value']
    else:
        values = df.get('aqi', [0] * len(df))
    
    # Create figure
    fig = go.Figure()
    
    # Add main trend line
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=values,
        mode='lines+markers',
        name=parameter.upper(),
        line=dict(color='#4ADE80', width=2),
        marker=dict(size=4),
        hovertemplate='<b>%{y:.1f}</b><br>%{x}<extra></extra>'
    ))
    
    # Add moving average
    if len(values) >= 24:
        ma_24h = values.rolling(window=24, min_periods=1).mean()
        fig.add_trace(go.Scatter(
            x=df['timestamp'],
            y=ma_24h,
            mode='lines',
            name='24h Moving Avg',
            line=dict(color='#FF7E00', width=2, dash='dash'),
            hovertemplate='<b>%{y:.1f}</b><br>%{x}<extra></extra>'
        ))
    
    # Add AQI threshold lines
    fig.add_hline(y=50, line_dash="dot", line_color="green", annotation_text="Good")
    fig.add_hline(y=100, line_dash="dot", line_color="yellow", annotation_text="Moderate")
    fig.add_hline(y=150, line_dash="dot", line_color="orange", annotation_text="Unhealthy for Sensitive")
    fig.add_hline(y=200, line_dash="dot", line_color="red", annotation_text="Unhealthy")
    
    # Update layout
    fig.update_layout(
        title=f"{parameter.upper()} Historical Trend",
        xaxis_title="Time",
        yaxis_title=f"{parameter.upper()} Value",
        hovermode='x unified',
        height=500,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    return fig


def create_daily_pattern_chart(historical_data: List[Dict[str, Any]]) -> go.Figure:
    """
    Create chart showing daily patterns (hourly averages).
    
    Args:
        historical_data: List of historical data points
        
    Returns:
        Plotly figure object
    """
    if not historical_data:
        return go.Figure()
    
    df = pd.DataFrame(historical_data)
    
    # Parse timestamps
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    elif 'time' in df.columns:
        df['timestamp'] = pd.to_datetime(df['time'])
    
    # Extract hour
    df['hour'] = df['timestamp'].dt.hour
    
    # Get values
    if 'pm25' in df.columns:
        value_col = 'pm25'
    elif 'value' in df.columns:
        value_col = 'value'
    else:
        value_col = 'aqi'
    
    # Calculate hourly averages
    hourly_avg = df.groupby('hour')[value_col].agg(['mean', 'std']).reset_index()
    
    # Create figure
    fig = go.Figure()
    
    # Add average line
    fig.add_trace(go.Scatter(
        x=hourly_avg['hour'],
        y=hourly_avg['mean'],
        mode='lines+markers',
        name='Average',
        line=dict(color='#4ADE80', width=3),
        marker=dict(size=8),
        hovertemplate='Hour: %{x}<br>Avg: %{y:.1f}<extra></extra>'
    ))
    
    # Add confidence band
    if 'std' in hourly_avg.columns:
        fig.add_trace(go.Scatter(
            x=hourly_avg['hour'],
            y=hourly_avg['mean'] + hourly_avg['std'],
            mode='lines',
            line=dict(width=0),
            showlegend=False,
            hoverinfo='skip'
        ))
        
        fig.add_trace(go.Scatter(
            x=hourly_avg['hour'],
            y=hourly_avg['mean'] - hourly_avg['std'],
            mode='lines',
            line=dict(width=0),
            fillcolor='rgba(74, 222, 128, 0.2)',
            fill='tonexty',
            name='±1 Std Dev',
            hoverinfo='skip'
        ))
    
    # Update layout
    fig.update_layout(
        title="Daily Pattern (Hourly Averages)",
        xaxis_title="Hour of Day",
        yaxis_title="Average Value",
        xaxis=dict(
            tickmode='linear',
            tick0=0,
            dtick=2
        ),
        height=400,
        showlegend=True
    )
    
    return fig


def create_weekly_pattern_chart(historical_data: List[Dict[str, Any]]) -> go.Figure:
    """
    Create chart showing weekly patterns.
    
    Args:
        historical_data: List of historical data points
        
    Returns:
        Plotly figure object
    """
    if not historical_data:
        return go.Figure()
    
    df = pd.DataFrame(historical_data)
    
    # Parse timestamps
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    elif 'time' in df.columns:
        df['timestamp'] = pd.to_datetime(df['time'])
    
    # Extract day of week
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_name'] = df['timestamp'].dt.day_name()
    
    # Get values
    if 'pm25' in df.columns:
        value_col = 'pm25'
    elif 'value' in df.columns:
        value_col = 'value'
    else:
        value_col = 'aqi'
    
    # Calculate daily averages
    daily_avg = df.groupby(['day_of_week', 'day_name'])[value_col].mean().reset_index()
    daily_avg = daily_avg.sort_values('day_of_week')
    
    # Create bar chart
    fig = go.Figure(go.Bar(
        x=daily_avg['day_name'],
        y=daily_avg[value_col],
        marker_color='#4ADE80',
        hovertemplate='<b>%{x}</b><br>Avg: %{y:.1f}<extra></extra>'
    ))
    
    fig.update_layout(
        title="Weekly Pattern (Daily Averages)",
        xaxis_title="Day of Week",
        yaxis_title="Average Value",
        height=400
    )
    
    return fig


def calculate_statistics(historical_data: List[Dict[str, Any]], parameter: str = "pm25") -> Dict[str, float]:
    """
    Calculate statistical metrics for historical data.
    
    Args:
        historical_data: List of historical data points
        parameter: Parameter to analyze
        
    Returns:
        Dictionary of statistics
    """
    if not historical_data:
        return {}
    
    df = pd.DataFrame(historical_data)
    
    # Get values
    if parameter in df.columns:
        values = df[parameter]
    elif 'value' in df.columns:
        values = df['value']
    else:
        values = df.get('aqi', pd.Series([]))
    
    if len(values) == 0:
        return {}
    
    return {
        'mean': float(values.mean()),
        'median': float(values.median()),
        'std': float(values.std()),
        'min': float(values.min()),
        'max': float(values.max()),
        'p25': float(values.quantile(0.25)),
        'p75': float(values.quantile(0.75)),
        'p95': float(values.quantile(0.95))
    }


def render_historical_analysis_panel(api_client, location: str):
    """
    Render comprehensive historical analysis panel.
    
    Args:
        api_client: API client instance
        location: Location name
    """
    st.markdown('''
    <div class="section-header">
        <span class="section-header-icon">📈</span>
        Historical Trend Analysis
    </div>
    ''', unsafe_allow_html=True)
    
    # Date range selector
    col1, col2, col3 = st.columns(3)
    
    with col1:
        days_back = st.selectbox("Time Period", [7, 14, 30, 60, 90], index=1)
    
    with col2:
        parameter = st.selectbox("Parameter", ["PM2.5", "PM10", "NO2", "AQI"], index=0)
    
    with col3:
        analysis_type = st.selectbox("Analysis", ["Trend", "Daily Pattern", "Weekly Pattern"])
    
    # Fetch historical data
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        with st.spinner("Loading historical data..."):
            historical_response = api_client.get_historical_data(
                location,
                start_date,
                end_date,
                parameter=parameter.lower().replace('.', '')
            )
        
        historical_data = historical_response.get('data', [])
        
        if historical_data:
            # Display selected analysis
            if analysis_type == "Trend":
                fig = create_trend_chart(historical_data, parameter.lower().replace('.', ''))
                st.plotly_chart(fig, use_container_width=True)
            elif analysis_type == "Daily Pattern":
                fig = create_daily_pattern_chart(historical_data)
                st.plotly_chart(fig, use_container_width=True)
            else:  # Weekly Pattern
                fig = create_weekly_pattern_chart(historical_data)
                st.plotly_chart(fig, use_container_width=True)
            
            # Statistics
            st.markdown("### 📊 Statistical Summary")
            stats = calculate_statistics(historical_data, parameter.lower().replace('.', ''))
            
            if stats:
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Mean", f"{stats['mean']:.1f}")
                    st.metric("Median", f"{stats['median']:.1f}")
                with col2:
                    st.metric("Std Dev", f"{stats['std']:.1f}")
                    st.metric("Min", f"{stats['min']:.1f}")
                with col3:
                    st.metric("Max", f"{stats['max']:.1f}")
                    st.metric("25th %ile", f"{stats['p25']:.1f}")
                with col4:
                    st.metric("75th %ile", f"{stats['p75']:.1f}")
                    st.metric("95th %ile", f"{stats['p95']:.1f}")
            
            # Export option
            from src.ui.spatial_viz import render_data_export_panel
            render_data_export_panel(historical_data, "historical")
            
        else:
            st.info("No historical data available for the selected period.")
            
    except Exception as e:
        st.error(f"Failed to load historical data: {str(e)}")
        logger.error(f"Historical analysis error: {e}")
