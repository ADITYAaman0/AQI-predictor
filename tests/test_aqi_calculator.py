"""
Tests for AQI Calculator
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.aqi_calculator import AQICalculator


class TestAQICalculator:
    """Test cases for AQI calculation logic"""
    
    def test_calculate_sub_index_pm25_good(self):
        """Test PM2.5 sub-index for good air quality"""
        calc = AQICalculator()
        result = calc.calculate_sub_index(10.0, 'pm25')
        assert result <= 50
        assert result >= 0
    
    def test_calculate_sub_index_pm25_moderate(self):
        """Test PM2.5 sub-index for moderate air quality"""
        calc = AQICalculator()
        result = calc.calculate_sub_index(25.0, 'pm25')
        assert 51 <= result <= 100
    
    def test_calculate_sub_index_pm25_unhealthy(self):
        """Test PM2.5 sub-index for unhealthy air quality"""
        calc = AQICalculator()
        result = calc.calculate_sub_index(100.0, 'pm25')
        assert result >= 150
    
    def test_calculate_aqi_from_pollutants(self):
        """Test overall AQI calculation from multiple pollutants"""
        calc = AQICalculator()
        pollutants = {
            'pm25': 35.5,  # Moderate
            'pm10': 50,    # Good
            'no2': 30      # Good
        }
        aqi, dominant, category = calc.calculate_aqi(pollutants)
        
        assert aqi > 0
        assert dominant == 'pm25'  # PM2.5 should be dominant
        assert category in ['good', 'moderate', 'unhealthy_sensitive']
    
    def test_get_category(self):
        """Test category determination"""
        calc = AQICalculator()
        
        assert calc.get_category(25) == 'good'
        assert calc.get_category(75) == 'moderate'
        assert calc.get_category(125) == 'unhealthy_sensitive'
        assert calc.get_category(175) == 'unhealthy'
        assert calc.get_category(250) == 'very_unhealthy'
        assert calc.get_category(400) == 'hazardous'
    
    def test_get_color(self):
        """Test color mapping"""
        calc = AQICalculator()
        
        color_good = calc.get_color(25)
        assert color_good == '#4ADE80'  # Green
        
        color_hazardous = calc.get_color(400)
        assert color_hazardous == '#7C2D12'  # Maroon
    
    def test_negative_concentration(self):
        """Test handling of negative concentration values"""
        calc = AQICalculator()
        result = calc.calculate_sub_index(-10.0, 'pm25')
        assert result == 0
    
    def test_unknown_pollutant(self):
        """Test handling of unknown pollutant"""
        calc = AQICalculator()
        with pytest.raises(ValueError):
            calc.calculate_sub_index(50.0, 'unknown')
    
    def test_empty_pollutants(self):
        """Test AQI calculation with empty pollutants dict"""
        calc = AQICalculator()
        aqi, dominant, category = calc.calculate_aqi({})
        
        assert aqi == 0
        assert dominant == 'unknown'
        assert category == 'good'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
