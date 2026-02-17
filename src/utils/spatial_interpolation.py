"""
Spatial Interpolation utilities for AQI grid predictions.
Implements kriging methods and spatial grid generation.
"""

import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
from scipy.spatial.distance import cdist
from scipy.linalg import solve

logger = logging.getLogger(__name__)


@dataclass
class GridPoint:
    """Represents a point in the spatial grid"""
    latitude: float
    longitude: float
    predicted_value: float
    confidence: float
    aqi: int
    category: str


@dataclass
class SpatialGrid:
    """Represents a spatial prediction grid"""
    bounds: Dict[str, float]  # north, south, east, west
    resolution_km: float
    grid_points: List[GridPoint]
    generated_at: datetime
    metadata: Dict[str, Any]


class SpatialInterpolator:
    """
    Spatial interpolation using kriging methods for AQI predictions
    """
    
    def __init__(self, variogram_model: str = 'exponential'):
        """
        Initialize spatial interpolator
        
        Args:
            variogram_model: Type of variogram model ('exponential', 'gaussian', 'spherical')
        """
        self.variogram_model = variogram_model
        self.variogram_params = None
        
    def generate_grid(self, bounds: Dict[str, float], resolution_km: float) -> List[Tuple[float, float]]:
        """
        Generate regular grid points within bounds
        
        Args:
            bounds: Dictionary with 'north', 'south', 'east', 'west' keys
            resolution_km: Grid resolution in kilometers
            
        Returns:
            List of (latitude, longitude) tuples
        """
        # Convert km to degrees (approximate)
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 km * cos(latitude)
        lat_step = resolution_km / 111.0
        
        # Use average latitude for longitude conversion
        avg_lat = (bounds['north'] + bounds['south']) / 2
        lon_step = resolution_km / (111.0 * np.cos(np.radians(avg_lat)))
        
        # Generate grid points, ensuring they stay within bounds
        lats = np.arange(bounds['south'], bounds['north'] + lat_step/2, lat_step)
        lons = np.arange(bounds['west'], bounds['east'] + lon_step/2, lon_step)
        
        # Filter to ensure all points are strictly within bounds
        lats = lats[lats <= bounds['north']]
        lons = lons[lons <= bounds['east']]
        
        grid_points = []
        for lat in lats:
            for lon in lons:
                # Double-check bounds to handle floating point precision issues
                if (bounds['south'] <= lat <= bounds['north'] and 
                    bounds['west'] <= lon <= bounds['east']):
                    grid_points.append((lat, lon))
        
        return grid_points
    
    def fit_variogram(self, coordinates: np.ndarray, values: np.ndarray) -> Dict[str, float]:
        """
        Fit variogram model to data
        
        Args:
            coordinates: Array of shape (n_points, 2) with lat/lon coordinates
            values: Array of values at each coordinate
            
        Returns:
            Dictionary with variogram parameters
        """
        # Calculate pairwise distances
        distances = cdist(coordinates, coordinates)
        
        # Calculate semivariances
        n_points = len(values)
        semivariances = []
        distance_bins = []
        
        # Create distance bins
        max_dist = np.max(distances) / 3  # Use 1/3 of max distance
        n_bins = min(15, n_points // 2)  # Reasonable number of bins
        bin_edges = np.linspace(0, max_dist, n_bins + 1)
        
        for i in range(n_bins):
            bin_start = bin_edges[i]
            bin_end = bin_edges[i + 1]
            
            # Find pairs in this distance bin
            mask = (distances >= bin_start) & (distances < bin_end) & (distances > 0)
            
            if np.any(mask):
                # Calculate semivariance for this bin
                pairs = np.where(mask)
                semivar = 0.5 * np.mean((values[pairs[0]] - values[pairs[1]]) ** 2)
                semivariances.append(semivar)
                distance_bins.append((bin_start + bin_end) / 2)
        
        if len(semivariances) < 3:
            # Not enough data for proper variogram fitting
            # Use simple default parameters
            return {
                'nugget': np.var(values) * 0.1,
                'sill': np.var(values),
                'range': max_dist / 2,
                'model': self.variogram_model
            }
        
        # Fit variogram model (simplified fitting)
        semivariances = np.array(semivariances)
        distance_bins = np.array(distance_bins)
        
        # Estimate parameters
        nugget = min(semivariances) if len(semivariances) > 0 else 0
        sill = max(semivariances) if len(semivariances) > 0 else np.var(values)
        range_param = distance_bins[np.argmax(semivariances)] if len(distance_bins) > 0 else max_dist / 2
        
        self.variogram_params = {
            'nugget': nugget,
            'sill': sill,
            'range': range_param,
            'model': self.variogram_model
        }
        
        return self.variogram_params
    
    def variogram_function(self, distances: np.ndarray) -> np.ndarray:
        """
        Calculate variogram values for given distances
        
        Args:
            distances: Array of distances
            
        Returns:
            Array of variogram values
        """
        if self.variogram_params is None:
            raise ValueError("Variogram not fitted. Call fit_variogram first.")
        
        nugget = self.variogram_params['nugget']
        sill = self.variogram_params['sill']
        range_param = self.variogram_params['range']
        
        if self.variogram_model == 'exponential':
            return nugget + (sill - nugget) * (1 - np.exp(-3 * distances / range_param))
        elif self.variogram_model == 'gaussian':
            return nugget + (sill - nugget) * (1 - np.exp(-3 * (distances / range_param) ** 2))
        elif self.variogram_model == 'spherical':
            result = np.full_like(distances, sill)
            mask = distances < range_param
            h = distances[mask]
            result[mask] = nugget + (sill - nugget) * (1.5 * h / range_param - 0.5 * (h / range_param) ** 3)
            return result
        else:
            raise ValueError(f"Unknown variogram model: {self.variogram_model}")
    
    def ordinary_kriging(self, known_coords: np.ndarray, known_values: np.ndarray,
                        predict_coords: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Perform ordinary kriging interpolation
        
        Args:
            known_coords: Array of shape (n_known, 2) with known coordinates
            known_values: Array of known values
            predict_coords: Array of shape (n_predict, 2) with prediction coordinates
            
        Returns:
            Tuple of (predictions, variances)
        """
        n_known = len(known_coords)
        n_predict = len(predict_coords)
        
        if n_known < 3:
            # Not enough points for kriging, use inverse distance weighting
            return self._inverse_distance_weighting(known_coords, known_values, predict_coords)
        
        # Fit variogram if not already fitted
        if self.variogram_params is None:
            self.fit_variogram(known_coords, known_values)
        
        # Calculate distance matrix between known points
        known_distances = cdist(known_coords, known_coords)
        
        # Build kriging matrix
        K = np.zeros((n_known + 1, n_known + 1))
        K[:n_known, :n_known] = self.variogram_function(known_distances)
        K[:n_known, n_known] = 1  # Lagrange multiplier column
        K[n_known, :n_known] = 1  # Lagrange multiplier row
        K[n_known, n_known] = 0   # Corner element
        
        predictions = np.zeros(n_predict)
        variances = np.zeros(n_predict)
        
        for i, pred_coord in enumerate(predict_coords):
            # Calculate distances from prediction point to known points
            pred_distances = cdist([pred_coord], known_coords)[0]
            
            # Build right-hand side vector
            rhs = np.zeros(n_known + 1)
            rhs[:n_known] = self.variogram_function(pred_distances)
            rhs[n_known] = 1
            
            try:
                # Solve kriging system
                weights = solve(K, rhs)
                
                # Calculate prediction
                predictions[i] = np.dot(weights[:n_known], known_values)
                
                # Calculate kriging variance
                variances[i] = np.dot(weights, rhs)
                
            except np.linalg.LinAlgError:
                # Fallback to inverse distance weighting for this point
                pred, var = self._inverse_distance_weighting(
                    known_coords, known_values, [pred_coord]
                )
                predictions[i] = pred[0]
                variances[i] = var[0]
        
        return predictions, variances
    
    def _inverse_distance_weighting(self, known_coords: np.ndarray, known_values: np.ndarray,
                                   predict_coords: np.ndarray, power: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Inverse distance weighting interpolation (fallback method)
        
        Args:
            known_coords: Array of shape (n_known, 2) with known coordinates
            known_values: Array of known values
            predict_coords: Array of shape (n_predict, 2) with prediction coordinates
            power: Power parameter for distance weighting
            
        Returns:
            Tuple of (predictions, variances)
        """
        n_predict = len(predict_coords)
        predictions = np.zeros(n_predict)
        variances = np.zeros(n_predict)
        
        for i, pred_coord in enumerate(predict_coords):
            distances = cdist([pred_coord], known_coords)[0]
            
            # Handle case where prediction point coincides with known point
            if np.any(distances == 0):
                idx = np.argmin(distances)
                predictions[i] = known_values[idx]
                variances[i] = 0
                continue
            
            # Calculate weights
            weights = 1 / (distances ** power)
            weights /= np.sum(weights)
            
            # Calculate prediction
            predictions[i] = np.dot(weights, known_values)
            
            # Estimate variance (simplified)
            variances[i] = np.var(known_values) * (1 - np.max(weights))
        
        return predictions, variances
    
    def interpolate_grid(self, station_data: Dict[str, Dict], bounds: Dict[str, float],
                        resolution_km: float = 1.0, parameter: str = 'pm25') -> SpatialGrid:
        """
        Interpolate values to a regular grid
        
        Args:
            station_data: Dictionary with station_id -> {'lat': float, 'lon': float, 'value': float}
            bounds: Dictionary with 'north', 'south', 'east', 'west' keys
            resolution_km: Grid resolution in kilometers
            parameter: Parameter being interpolated
            
        Returns:
            SpatialGrid object with interpolated values
        """
        from ..utils.aqi_calculator import AQICalculator
        
        # Extract coordinates and values
        coords = []
        values = []
        
        for station_id, data in station_data.items():
            if 'lat' in data and 'lon' in data and parameter in data:
                coords.append([data['lat'], data['lon']])
                values.append(data[parameter])
        
        if len(coords) < 2:
            raise ValueError(f"Need at least 2 stations with {parameter} data for interpolation")
        
        coords = np.array(coords)
        values = np.array(values)
        
        # Generate grid points
        grid_coords = self.generate_grid(bounds, resolution_km)
        grid_coords_array = np.array(grid_coords)
        
        # Perform interpolation
        try:
            predictions, variances = self.ordinary_kriging(coords, values, grid_coords_array)
        except Exception as e:
            logger.warning(f"Kriging failed, using inverse distance weighting: {e}")
            predictions, variances = self._inverse_distance_weighting(coords, values, grid_coords_array)
        
        # Convert to AQI and create grid points
        aqi_calc = AQICalculator()
        grid_points = []
        
        for i, (lat, lon) in enumerate(grid_coords):
            pred_value = max(0, predictions[i])  # Ensure non-negative
            confidence = max(0.1, 1.0 - min(1.0, np.sqrt(variances[i]) / np.std(values)))
            
            # Calculate AQI
            aqi = aqi_calc.calculate_sub_index(pred_value, parameter)
            category = aqi_calc.get_category(aqi)
            
            grid_points.append(GridPoint(
                latitude=lat,
                longitude=lon,
                predicted_value=round(pred_value, 1),
                confidence=round(confidence, 3),
                aqi=aqi,
                category=category
            ))
        
        return SpatialGrid(
            bounds=bounds,
            resolution_km=resolution_km,
            grid_points=grid_points,
            generated_at=datetime.utcnow(),
            metadata={
                'parameter': parameter,
                'n_stations': len(coords),
                'interpolation_method': 'ordinary_kriging' if self.variogram_params else 'inverse_distance_weighting',
                'variogram_model': self.variogram_model,
                'variogram_params': self.variogram_params
            }
        )
    
    def validate_bounds(self, bounds: Dict[str, float]) -> bool:
        """
        Validate spatial bounds
        
        Args:
            bounds: Dictionary with 'north', 'south', 'east', 'west' keys
            
        Returns:
            True if bounds are valid
        """
        required_keys = ['north', 'south', 'east', 'west']
        
        if not all(key in bounds for key in required_keys):
            return False
        
        if bounds['north'] <= bounds['south']:
            return False
        
        if bounds['east'] <= bounds['west']:
            return False
        
        # Check if bounds are within reasonable limits
        if not (-90 <= bounds['south'] < bounds['north'] <= 90):
            return False
        
        if not (-180 <= bounds['west'] < bounds['east'] <= 180):
            return False
        
        return True
    
    def estimate_grid_size(self, bounds: Dict[str, float], resolution_km: float) -> int:
        """
        Estimate number of grid points for given bounds and resolution
        
        Args:
            bounds: Dictionary with 'north', 'south', 'east', 'west' keys
            resolution_km: Grid resolution in kilometers
            
        Returns:
            Estimated number of grid points
        """
        if not self.validate_bounds(bounds):
            return 0
        
        # Calculate approximate dimensions
        lat_range = bounds['north'] - bounds['south']
        lon_range = bounds['east'] - bounds['west']
        
        # Convert to km (approximate)
        avg_lat = (bounds['north'] + bounds['south']) / 2
        lat_km = lat_range * 111.0
        lon_km = lon_range * 111.0 * np.cos(np.radians(avg_lat))
        
        # Calculate grid dimensions
        n_lat = int(np.ceil(lat_km / resolution_km)) + 1
        n_lon = int(np.ceil(lon_km / resolution_km)) + 1
        
        return n_lat * n_lon


def create_delhi_bounds() -> Dict[str, float]:
    """Create default bounds for Delhi NCR region"""
    return {
        'north': 28.9,
        'south': 28.3,
        'east': 77.5,
        'west': 76.9
    }


def create_mumbai_bounds() -> Dict[str, float]:
    """Create default bounds for Mumbai region"""
    return {
        'north': 19.3,
        'south': 18.9,
        'east': 72.9,
        'west': 72.7
    }


def get_city_bounds(city_name: str) -> Optional[Dict[str, float]]:
    """
    Get default bounds for major cities
    
    Args:
        city_name: Name of the city
        
    Returns:
        Dictionary with bounds or None if city not found
    """
    city_bounds = {
        'delhi': create_delhi_bounds(),
        'mumbai': create_mumbai_bounds(),
        'bangalore': {
            'north': 13.1,
            'south': 12.8,
            'east': 77.8,
            'west': 77.4
        },
        'chennai': {
            'north': 13.2,
            'south': 12.9,
            'east': 80.3,
            'west': 80.1
        },
        'kolkata': {
            'north': 22.7,
            'south': 22.4,
            'east': 88.5,
            'west': 88.2
        },
        'hyderabad': {
            'north': 17.5,
            'south': 17.2,
            'east': 78.6,
            'west': 78.2
        }
    }
    
    return city_bounds.get(city_name.lower())