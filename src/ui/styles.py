"""
UI Styles - Glassmorphism CSS and dynamic backgrounds
Based on Graphics Instructions document
"""

from ..utils.constants import AQI_COLORS, AQI_BACKGROUNDS, AQI_CATEGORIES


def get_glassmorphism_css() -> str:
    """
    Get comprehensive CSS for glassmorphism UI design
    Based on the Graphics Instructions document specifications
    """
    return '''
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
    
    /* Root variables */
    :root {
        --aqi-good: #4ADE80;
        --aqi-moderate: #FCD34D;
        --aqi-unhealthy-sensitive: #FB923C;
        --aqi-unhealthy: #EF4444;
        --aqi-very-unhealthy: #A855F7;
        --aqi-hazardous: #7C2D12;
        
        --bg-primary: #0F172A;
        --bg-secondary: #1E293B;
        --text-primary: #FFFFFF;
        --text-secondary: rgba(255, 255, 255, 0.7);
        --accent: #F59E0B;
        
        --glass-bg: rgba(255, 255, 255, 0.1);
        --glass-border: rgba(255, 255, 255, 0.18);
        --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Main app styling */
    .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Glass card effect */
    .glass-card {
        background: var(--glass-bg);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        box-shadow: var(--glass-shadow);
        padding: 24px;
        margin: 8px 0;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .glass-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
    }
    
    /* AQI Gauge styling */
    .aqi-gauge-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px;
    }
    
    .aqi-value {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 72px;
        font-weight: 700;
        line-height: 1;
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .aqi-label {
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--text-secondary);
        margin-top: 8px;
    }
    
    .aqi-category {
        font-size: 24px;
        font-weight: 600;
        margin-top: 16px;
        padding: 8px 24px;
        border-radius: 24px;
        background: var(--glass-bg);
    }
    
    /* Pollutant cards */
    .pollutant-card {
        background: var(--glass-bg);
        backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        transition: all 0.3s ease;
    }
    
    .pollutant-card:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.02);
    }
    
    .pollutant-icon {
        font-size: 32px;
        margin-bottom: 8px;
    }
    
    .pollutant-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 4px;
    }
    
    .pollutant-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
    }
    
    .pollutant-unit {
        font-size: 12px;
        color: var(--text-secondary);
    }
    
    /* Weather badges */
    .weather-badge {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: 50%;
        margin: 4px;
    }
    
    .weather-badge-icon {
        font-size: 24px;
    }
    
    .weather-badge-value {
        font-size: 14px;
        font-weight: 600;
        margin-top: 4px;
    }
    
    /* Health recommendation card */
    .health-card {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        padding: 24px;
        border-left: 4px solid var(--accent);
    }
    
    .health-card-good {
        border-left-color: var(--aqi-good);
    }
    
    .health-card-moderate {
        border-left-color: var(--aqi-moderate);
    }
    
    .health-card-unhealthy {
        border-left-color: var(--aqi-unhealthy);
    }
    
    .health-card-hazardous {
        border-left-color: var(--aqi-hazardous);
    }
    
    /* Progress bars */
    .progress-bar {
        height: 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
        margin-top: 8px;
    }
    
    .progress-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
    }
    
    /* Section headers */
    .section-header {
        font-size: 24px;
        font-weight: 600;
        margin: 24px 0 16px 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .section-header-icon {
        font-size: 28px;
    }
    
    /* Metric display */
    .metric-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
    }
    
    .metric-value {
        font-size: 36px;
        font-weight: 700;
    }
    
    .metric-label {
        font-size: 12px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.5s ease forwards;
    }
    
    .animate-pulse {
        animation: pulse 2s ease-in-out infinite;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .aqi-value {
            font-size: 48px;
        }
        
        .glass-card {
            padding: 16px;
        }
        
        .pollutant-value {
            font-size: 24px;
        }
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: var(--bg-secondary);
    }
    
    ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
    }
    </style>
    '''


def get_dynamic_background(aqi: int) -> str:
    """
    Get CSS for dynamic background based on AQI level
    
    Args:
        aqi: Current AQI value
        
    Returns:
        CSS style string for background
    """
    # Determine category
    category = 'good'
    for key, cat in AQI_CATEGORIES.items():
        if cat['min'] <= aqi <= cat['max']:
            category = key
            break
    
    gradient = AQI_BACKGROUNDS.get(category, AQI_BACKGROUNDS['good'])
    color = AQI_COLORS.get(category, AQI_COLORS['good'])
    
    return f'''
    <style>
    .stApp {{
        background: {gradient};
        background-attachment: fixed;
    }}
    
    /* Add subtle animated overlay */
    .stApp::before {{
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
    }}
    
    /* Ensure content is above overlay */
    .main .block-container {{
        position: relative;
        z-index: 1;
    }}
    
    /* Category-specific accent */
    .stProgress > div > div {{
        background-color: {color} !important;
    }}
    
    .stButton > button {{
        background: {color};
        border: none;
        color: white;
    }}
    
    .stButton > button:hover {{
        background: {color};
        opacity: 0.9;
    }}
    </style>
    '''


def get_aqi_gauge_html(aqi: int, label: str, color: str) -> str:
    """
    Generate HTML for AQI gauge display
    
    Args:
        aqi: AQI value
        label: Category label
        color: Hex color
        
    Returns:
        HTML string for gauge
    """
    # Calculate rotation for gauge (0-500 AQI = 0-180 degrees)
    rotation = min(180, (aqi / 500) * 180)
    
    return f'''
    <div class="glass-card aqi-gauge-container animate-fade-in">
        <svg width="240" height="140" viewBox="0 0 240 140">
            <!-- Background arc -->
            <path d="M 30 120 A 90 90 0 0 1 210 120" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.1)" 
                  stroke-width="12"
                  stroke-linecap="round"/>
            
            <!-- Colored arc -->
            <path d="M 30 120 A 90 90 0 0 1 210 120" 
                  fill="none" 
                  stroke="{color}" 
                  stroke-width="12"
                  stroke-linecap="round"
                  stroke-dasharray="282.6"
                  stroke-dashoffset="{282.6 * (1 - aqi/500)}"
                  style="filter: drop-shadow(0 0 10px {color})"/>
        </svg>
        
        <div class="aqi-value" style="color: {color}; margin-top: -60px;">
            {aqi}
        </div>
        <div class="aqi-label">Air Quality Index</div>
        <div class="aqi-category" style="background: {color}22; color: {color};">
            {label}
        </div>
    </div>
    '''
