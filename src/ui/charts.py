"""
Charts - Plotly visualizations for AQI data
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd

from ..utils.constants import AQI_COLORS, AQI_CATEGORIES, SOURCE_CATEGORIES


def create_forecast_chart(forecasts: List[Dict], 
                          show_confidence: bool = True) -> go.Figure:
    """
    Create 24-hour forecast area chart
    
    Args:
        forecasts: List of hourly forecast dictionaries
        show_confidence: Whether to show confidence intervals
        
    Returns:
        Plotly figure
    """
    if not forecasts:
        return _empty_chart("No forecast data available")
    
    df = pd.DataFrame(forecasts)
    
    # Create figure
    fig = go.Figure()
    
    # Add confidence band if available
    if show_confidence and 'aqi_lower' in df.columns and 'aqi_upper' in df.columns:
        fig.add_trace(go.Scatter(
            x=df['timestamp'],
            y=df['aqi_upper'],
            mode='lines',
            line=dict(width=0),
            showlegend=False,
            hoverinfo='skip'
        ))
        
        fig.add_trace(go.Scatter(
            x=df['timestamp'],
            y=df['aqi_lower'],
            mode='lines',
            line=dict(width=0),
            fill='tonexty',
            fillcolor='rgba(255, 255, 255, 0.1)',
            name='80% Confidence',
            hoverinfo='skip'
        ))
    
    # Main forecast line with gradient coloring
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['aqi'],
        mode='lines+markers',
        name='AQI Forecast',
        line=dict(
            color='#4ADE80',
            width=3,
            shape='spline'
        ),
        marker=dict(
            size=8,
            color=[_get_aqi_color(aqi) for aqi in df['aqi']],
            line=dict(width=2, color='white')
        ),
        hovertemplate='<b>%{x|%I %p}</b><br>AQI: %{y}<extra></extra>'
    ))
    
    # Add AQI threshold lines
    thresholds = [
        (50, 'Good', '#4ADE80'),
        (100, 'Moderate', '#FCD34D'),
        (150, 'Unhealthy (Sensitive)', '#FB923C'),
        (200, 'Unhealthy', '#EF4444')
    ]
    
    for val, label, color in thresholds:
        if df['aqi'].max() > val - 20:  # Only show relevant thresholds
            fig.add_hline(
                y=val, 
                line_dash="dot", 
                line_color=color,
                opacity=0.5,
                annotation_text=label,
                annotation_position="right"
            )
    
    # Layout
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=20, r=20, t=40, b=20),
        height=350,
        title=dict(
            text='24-Hour AQI Forecast',
            font=dict(size=18, color='white')
        ),
        xaxis=dict(
            title='',
            gridcolor='rgba(255,255,255,0.1)',
            tickformat='%I %p',
            tickangle=0
        ),
        yaxis=dict(
            title='AQI',
            gridcolor='rgba(255,255,255,0.1)',
            range=[0, max(df['aqi'].max() * 1.2, 100)]
        ),
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='right',
            x=1
        ),
        hovermode='x unified'
    )
    
    return fig


def create_attribution_chart(attribution: Dict) -> go.Figure:
    """
    Create source attribution donut chart
    
    Args:
        attribution: Attribution result dictionary
        
    Returns:
        Plotly figure
    """
    sources = attribution.get('sources', [])
    
    if not sources:
        return _empty_chart("No attribution data")
    
    labels = [s['name'] for s in sources]
    values = [s['percentage'] for s in sources]
    colors = [s['color'] for s in sources]
    icons = [s['icon'] for s in sources]
    
    # Create donut chart
    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        hole=0.6,
        marker=dict(
            colors=colors,
            line=dict(color='white', width=2)
        ),
        textinfo='percent',
        textposition='outside',
        textfont=dict(size=14, color='white'),
        hovertemplate='<b>%{label}</b><br>%{percent}<extra></extra>',
        pull=[0.02] * len(sources)
    )])
    
    # Add center text
    fig.add_annotation(
        text='Source<br>Attribution',
        x=0.5, y=0.5,
        font=dict(size=16, color='white'),
        showarrow=False
    )
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=20, r=20, t=40, b=20),
        height=350,
        title=dict(
            text='Pollution Source Breakdown',
            font=dict(size=18, color='white')
        ),
        showlegend=True,
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=-0.15,
            xanchor='center',
            x=0.5,
            font=dict(color='white')
        )
    )
    
    return fig


def create_pollutant_bars(pollutants: Dict[str, float]) -> go.Figure:
    """
    Create horizontal bar chart for pollutant comparison
    
    Args:
        pollutants: Dictionary of pollutant values
        
    Returns:
        Plotly figure
    """
    from ..utils.aqi_calculator import AQICalculator
    calc = AQICalculator()
    
    # Calculate sub-indices for each pollutant
    data = []
    for key, value in pollutants.items():
        if value is not None and key in ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']:
            sub_idx = calc.calculate_sub_index(value, key)
            color = calc.get_color(sub_idx)
            data.append({
                'pollutant': key.upper().replace('25', '2.5'),
                'value': value,
                'sub_index': sub_idx,
                'color': color
            })
    
    if not data:
        return _empty_chart("No pollutant data")
    
    df = pd.DataFrame(data)
    df = df.sort_values('sub_index', ascending=True)
    
    fig = go.Figure(go.Bar(
        x=df['sub_index'],
        y=df['pollutant'],
        orientation='h',
        marker=dict(
            color=df['color'],
            opacity=0.8,
            line=dict(width=1, color='white')
        ),
        text=df['value'].apply(lambda x: f'{x:.1f}'),
        textposition='outside',
        textfont=dict(color='white', size=12),
        hovertemplate='<b>%{y}</b><br>Sub-index: %{x}<br>Value: %{text}<extra></extra>'
    ))
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=60, r=40, t=40, b=20),
        height=300,
        title=dict(
            text='Pollutant Sub-Indices',
            font=dict(size=18, color='white')
        ),
        xaxis=dict(
            title='AQI Sub-Index',
            gridcolor='rgba(255,255,255,0.1)',
            range=[0, max(df['sub_index'].max() * 1.3, 100)]
        ),
        yaxis=dict(
            title='',
            gridcolor='rgba(255,255,255,0.1)'
        )
    )
    
    return fig


def create_historical_heatmap(data: List[Dict]) -> go.Figure:
    """
    Create calendar heatmap for historical AQI data
    
    Args:
        data: List of daily AQI dictionaries
        
    Returns:
        Plotly figure
    """
    if not data:
        return _empty_chart("No historical data available")
    
    df = pd.DataFrame(data)
    
    # Calculate AQI from PM2.5 if not present
    if 'aqi' not in df.columns and 'pm25' in df.columns:
        from ..utils.aqi_calculator import AQICalculator
        calc = AQICalculator()
        df['aqi'] = df['pm25'].apply(lambda x: calc.calculate_sub_index(x, 'pm25'))
    
    # Create heatmap
    fig = go.Figure(data=go.Heatmap(
        z=[df['aqi'].values],
        x=df['date'].values if 'date' in df.columns else list(range(len(df))),
        colorscale=[
            [0, '#4ADE80'],      # Good
            [0.2, '#FCD34D'],    # Moderate
            [0.4, '#FB923C'],    # Unhealthy Sensitive
            [0.6, '#EF4444'],    # Unhealthy
            [0.8, '#A855F7'],    # Very Unhealthy
            [1, '#7C2D12']       # Hazardous
        ],
        zmin=0,
        zmax=300,
        colorbar=dict(
            title='AQI',
            titlefont=dict(color='white'),
            tickfont=dict(color='white')
        ),
        hovertemplate='Date: %{x}<br>AQI: %{z}<extra></extra>'
    ))
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=20, r=20, t=40, b=40),
        height=150,
        title=dict(
            text='Daily AQI History',
            font=dict(size=18, color='white')
        ),
        xaxis=dict(
            title='',
            tickangle=45
        ),
        yaxis=dict(visible=False)
    )
    
    return fig


def create_weather_correlation_chart(forecasts: List[Dict]) -> go.Figure:
    """
    Create chart showing AQI correlation with weather factors
    
    Args:
        forecasts: List of forecast dictionaries with weather data
        
    Returns:
        Plotly figure
    """
    if not forecasts:
        return _empty_chart("No data available")
    
    df = pd.DataFrame(forecasts)
    
    # Create subplots
    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.1,
        subplot_titles=('AQI Forecast', 'Weather Conditions')
    )
    
    # AQI line
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['aqi'],
        name='AQI',
        line=dict(color='#4ADE80', width=2),
        mode='lines'
    ), row=1, col=1)
    
    # Temperature
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['temperature'],
        name='Temp (°C)',
        line=dict(color='#F59E0B', width=1),
        mode='lines'
    ), row=2, col=1)
    
    # Wind speed (scaled)
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['wind_speed'] * 5,  # Scale for visibility
        name='Wind (×5)',
        line=dict(color='#3B82F6', width=1, dash='dot'),
        mode='lines'
    ), row=2, col=1)
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=40, r=20, t=60, b=20),
        height=400,
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='right',
            x=1
        ),
        hovermode='x unified'
    )
    
    fig.update_xaxes(gridcolor='rgba(255,255,255,0.1)')
    fig.update_yaxes(gridcolor='rgba(255,255,255,0.1)')
    
    return fig


def _get_aqi_color(aqi: int) -> str:
    """Get color for specific AQI value"""
    for key, cat in AQI_CATEGORIES.items():
        if cat['min'] <= aqi <= cat['max']:
            return AQI_COLORS[key]
    return AQI_COLORS['hazardous']


def _empty_chart(message: str) -> go.Figure:
    """Create empty chart with message"""
    fig = go.Figure()
    fig.add_annotation(
        text=message,
        x=0.5, y=0.5,
        xref='paper', yref='paper',
        font=dict(size=16, color='rgba(255,255,255,0.5)'),
        showarrow=False
    )
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=20, r=20, t=20, b=20),
        height=300
    )
    return fig
