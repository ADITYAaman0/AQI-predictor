#!/usr/bin/env python3
"""
GNN Model Training Script

This script trains the Graph Neural Network model for spatial air quality predictions.
It includes spatial validation and model performance evaluation.
"""

import sys
import os
import logging
import argparse
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.gnn_spatial import SpatialGNN, Station
from src.data.openaq_client import OpenAQClient
from src.data.ingestion_clients import IMDClient
from src.utils.aqi_calculator import AQICalculator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GNNTrainer:
    """GNN model trainer with spatial validation"""
    
    def __init__(self, model_dir: str = "models/gnn"):
        """
        Initialize GNN trainer
        
        Args:
            model_dir: Directory to save trained models
        """
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize data clients
        self.openaq_client = OpenAQClient()
        self.weather_client = IMDClient()
        self.aqi_calc = AQICalculator()
        
        # Training configuration
        self.config = {
            'epochs': 200,
            'learning_rate': 0.01,
            'hidden_dim': 64,
            'num_layers': 3,
            'validation_split': 0.2,
            'spatial_validation_distance': 50.0,  # km
            'min_stations': 5,
            'target_parameter': 'pm25'
        }
    
    def get_training_stations(self, city: str = 'delhi') -> List[Station]:
        """
        Get list of training stations for a city
        
        Args:
            city: City name
            
        Returns:
            List of Station objects
        """
        logger.info(f"Getting training stations for {city}")
        
        # Define city bounds (Delhi-NCR region)
        city_bounds = {
            'delhi': {
                'north': 28.8,
                'south': 28.4,
                'east': 77.5,
                'west': 76.8
            },
            'mumbai': {
                'north': 19.3,
                'south': 18.9,
                'east': 72.9,
                'west': 72.7
            },
            'bangalore': {
                'north': 13.1,
                'south': 12.8,
                'east': 77.8,
                'west': 77.4
            }
        }
        
        bounds = city_bounds.get(city.lower(), city_bounds['delhi'])
        
        # Get stations from OpenAQ
        try:
            stations_data = self.openaq_client.get_locations(
                bounds=bounds,
                limit=100
            )
            
            stations = []
            for station_data in stations_data:
                station = Station(
                    id=station_data.get('id', str(len(stations))),
                    name=station_data.get('name', f'Station {len(stations)}'),
                    latitude=station_data.get('coordinates', {}).get('latitude', 0),
                    longitude=station_data.get('coordinates', {}).get('longitude', 0),
                    elevation=station_data.get('elevation'),
                    station_type=station_data.get('type', 'monitoring')
                )
                stations.append(station)
            
            logger.info(f"Found {len(stations)} stations for {city}")
            return stations
            
        except Exception as e:
            logger.warning(f"Failed to get stations from OpenAQ: {e}")
            
            # Fallback to predefined stations
            fallback_stations = [
                Station(id="delhi_1", name="Delhi Station 1", latitude=28.6139, longitude=77.2090),
                Station(id="delhi_2", name="Delhi Station 2", latitude=28.6500, longitude=77.2300),
                Station(id="delhi_3", name="Delhi Station 3", latitude=28.5800, longitude=77.1800),
                Station(id="delhi_4", name="Delhi Station 4", latitude=28.7000, longitude=77.2500),
                Station(id="delhi_5", name="Delhi Station 5", latitude=28.5500, longitude=77.2800),
            ]
            
            logger.info(f"Using {len(fallback_stations)} fallback stations")
            return fallback_stations
    
    def generate_training_data(self, stations: List[Station], 
                             days: int = 30) -> Dict[str, pd.DataFrame]:
        """
        Generate training data for stations
        
        Args:
            stations: List of stations
            days: Number of days of data to generate
            
        Returns:
            Dict mapping station_id to DataFrame with features and target
        """
        logger.info(f"Generating training data for {len(stations)} stations over {days} days")
        
        # Generate synthetic training data (in production, use real data)
        training_data = {}
        
        # Time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        timestamps = pd.date_range(start=start_date, end=end_date, freq='h')
        
        for station in stations:
            logger.debug(f"Generating data for station {station.id}")
            
            n_samples = len(timestamps)
            
            # Generate synthetic features
            np.random.seed(hash(station.id) % 2**32)  # Consistent seed per station
            
            # Weather features
            temperature = 25 + 10 * np.sin(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 2, n_samples)
            humidity = 60 + 20 * np.sin(np.arange(n_samples) * 2 * np.pi / 24 + np.pi) + np.random.normal(0, 5, n_samples)
            wind_speed = 3 + 2 * np.random.exponential(1, n_samples)
            wind_direction = np.random.uniform(0, 360, n_samples)
            pressure = 1013 + np.random.normal(0, 10, n_samples)
            
            # Time features
            hour = timestamps.hour
            day_of_week = timestamps.dayofweek
            is_weekend = (day_of_week >= 5).astype(int)
            
            # Location-based pollution baseline
            lat_factor = (station.latitude - 28.6) * 10  # Distance from Delhi center
            lon_factor = (station.longitude - 77.2) * 10
            location_baseline = 50 + lat_factor + lon_factor
            
            # Generate PM2.5 values with realistic patterns
            # Daily pattern (higher in morning and evening)
            daily_pattern = 20 * (np.sin(hour * 2 * np.pi / 24 - np.pi/2) + 1)
            
            # Weekly pattern (higher on weekdays)
            weekly_pattern = 10 * (1 - is_weekend)
            
            # Weather influence
            weather_influence = (
                -0.5 * (temperature - 25) +  # Cooler = more pollution
                0.3 * humidity +              # Higher humidity = more pollution
                -2.0 * wind_speed +           # Higher wind = less pollution
                0.01 * (pressure - 1013)      # Pressure influence
            )
            
            # Random noise
            noise = np.random.normal(0, 15, n_samples)
            
            # Combine all factors
            pm25 = np.maximum(5, location_baseline + daily_pattern + weekly_pattern + weather_influence + noise)
            
            # Create DataFrame
            df = pd.DataFrame({
                'timestamp': timestamps,
                'temperature': temperature,
                'humidity': humidity,
                'wind_speed': wind_speed,
                'wind_direction': wind_direction,
                'pressure': pressure,
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend,
                'pm25': pm25
            })
            
            training_data[station.id] = df
        
        logger.info(f"Generated training data for {len(training_data)} stations")
        return training_data
    
    def spatial_train_test_split(self, stations: List[Station], 
                               training_data: Dict[str, pd.DataFrame],
                               test_ratio: float = 0.2) -> Tuple[Dict, Dict, List[Station], List[Station]]:
        """
        Split data spatially for validation
        
        Args:
            stations: List of all stations
            training_data: Training data dict
            test_ratio: Ratio of stations to use for testing
            
        Returns:
            Tuple of (train_data, test_data, train_stations, test_stations)
        """
        logger.info(f"Performing spatial train-test split with {test_ratio} test ratio")
        
        # Randomly select test stations
        np.random.seed(42)  # For reproducibility
        n_test = max(1, int(len(stations) * test_ratio))
        test_indices = np.random.choice(len(stations), n_test, replace=False)
        
        train_stations = [stations[i] for i in range(len(stations)) if i not in test_indices]
        test_stations = [stations[i] for i in test_indices]
        
        # Split data
        train_data = {s.id: training_data[s.id] for s in train_stations if s.id in training_data}
        test_data = {s.id: training_data[s.id] for s in test_stations if s.id in training_data}
        
        logger.info(f"Split: {len(train_stations)} train stations, {len(test_stations)} test stations")
        return train_data, test_data, train_stations, test_stations
    
    def train_model(self, stations: List[Station], 
                   training_data: Dict[str, pd.DataFrame]) -> Tuple[SpatialGNN, Dict[str, Any]]:
        """
        Train GNN model
        
        Args:
            stations: List of training stations
            training_data: Training data
            
        Returns:
            Tuple of (trained_model, training_metrics)
        """
        logger.info("Training GNN model")
        
        # Initialize GNN model
        gnn = SpatialGNN(
            stations=stations,
            hidden_dim=self.config['hidden_dim'],
            num_layers=self.config['num_layers']
        )
        
        # Update adjacency matrix with correlation if we have enough data
        if len(training_data) > 2:
            # Prepare correlation data
            correlation_data = []
            for station_id, df in training_data.items():
                for _, row in df.iterrows():
                    correlation_data.append({
                        'timestamp': row['timestamp'],
                        'station_id': station_id,
                        'pm25': row['pm25']
                    })
            
            correlation_df = pd.DataFrame(correlation_data)
            gnn.update_adjacency_with_correlation(correlation_df)
        
        # Train model
        training_metrics = gnn.train(
            station_data=training_data,
            target_column=self.config['target_parameter'],
            epochs=self.config['epochs'],
            learning_rate=self.config['learning_rate']
        )
        
        logger.info(f"Training completed. Final RMSE: {training_metrics['train_rmse']:.2f}")
        return gnn, training_metrics
    
    def validate_model(self, model: SpatialGNN, 
                      test_data: Dict[str, pd.DataFrame],
                      test_stations: List[Station]) -> Dict[str, Any]:
        """
        Validate GNN model with spatial validation
        
        Args:
            model: Trained GNN model
            test_data: Test data
            test_stations: Test stations
            
        Returns:
            Validation metrics
        """
        logger.info("Validating GNN model")
        
        predictions = []
        actuals = []
        station_errors = {}
        
        for station in test_stations:
            if station.id not in test_data:
                continue
            
            df = test_data[station.id]
            station_predictions = []
            station_actuals = []
            
            # Test on each time point
            for idx, row in df.iterrows():
                try:
                    # Prepare features (exclude target)
                    features = {
                        col: row[col] for col in df.columns 
                        if col not in ['timestamp', self.config['target_parameter']]
                    }
                    
                    # Convert to numpy array in correct order
                    feature_array = np.array([
                        features.get('temperature', 25),
                        features.get('humidity', 60),
                        features.get('wind_speed', 3),
                        features.get('wind_direction', 180),
                        features.get('pressure', 1013),
                        features.get('hour', 12),
                        features.get('day_of_week', 1),
                        features.get('is_weekend', 0)
                    ])
                    
                    # Make prediction
                    station_data = {station.id: feature_array}
                    pred_result = model.predict_spatial(station_data)
                    
                    if station.id in pred_result:
                        pred_value = pred_result[station.id]
                        actual_value = row[self.config['target_parameter']]
                        
                        station_predictions.append(pred_value)
                        station_actuals.append(actual_value)
                        predictions.append(pred_value)
                        actuals.append(actual_value)
                
                except Exception as e:
                    logger.warning(f"Prediction failed for station {station.id}: {e}")
                    continue
            
            # Calculate station-specific metrics
            if station_predictions:
                station_rmse = np.sqrt(np.mean((np.array(station_predictions) - np.array(station_actuals)) ** 2))
                station_errors[station.id] = {
                    'rmse': float(station_rmse),
                    'mae': float(np.mean(np.abs(np.array(station_predictions) - np.array(station_actuals)))),
                    'n_predictions': len(station_predictions)
                }
        
        # Calculate overall metrics
        if predictions:
            predictions = np.array(predictions)
            actuals = np.array(actuals)
            
            rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
            mae = np.mean(np.abs(predictions - actuals))
            
            # Calculate accuracy within bounds
            within_20_percent = np.mean(np.abs(predictions - actuals) / actuals <= 0.2) * 100
            within_30_percent = np.mean(np.abs(predictions - actuals) / actuals <= 0.3) * 100
            
            validation_metrics = {
                'rmse': float(rmse),
                'mae': float(mae),
                'within_20_percent': float(within_20_percent),
                'within_30_percent': float(within_30_percent),
                'n_predictions': len(predictions),
                'n_test_stations': len(test_stations),
                'station_errors': station_errors
            }
            
            logger.info(f"Validation RMSE: {rmse:.2f}, MAE: {mae:.2f}")
            logger.info(f"Accuracy within 20%: {within_20_percent:.1f}%")
            
            return validation_metrics
        else:
            logger.error("No valid predictions made during validation")
            return {'error': 'No valid predictions'}
    
    def test_spatial_interpolation(self, model: SpatialGNN,
                                 test_stations: List[Station]) -> Dict[str, Any]:
        """
        Test spatial interpolation capabilities
        
        Args:
            model: Trained GNN model
            test_stations: Test stations
            
        Returns:
            Interpolation test results
        """
        logger.info("Testing spatial interpolation")
        
        # Create test grid points
        if test_stations:
            # Get bounds from test stations
            lats = [s.latitude for s in test_stations]
            lons = [s.longitude for s in test_stations]
            
            min_lat, max_lat = min(lats), max(lats)
            min_lon, max_lon = min(lons), max(lons)
            
            # Expand bounds slightly
            lat_range = max_lat - min_lat
            lon_range = max_lon - min_lon
            
            min_lat -= lat_range * 0.1
            max_lat += lat_range * 0.1
            min_lon -= lon_range * 0.1
            max_lon += lon_range * 0.1
        else:
            # Default Delhi bounds
            min_lat, max_lat = 28.4, 28.8
            min_lon, max_lon = 76.8, 77.5
        
        # Create 1km grid
        resolution_deg = 0.01  # Approximately 1km
        grid_lats = np.arange(min_lat, max_lat, resolution_deg)
        grid_lons = np.arange(min_lon, max_lon, resolution_deg)
        
        grid_points = [(lat, lon) for lat in grid_lats for lon in grid_lons]
        
        # Generate sample predictions for stations
        station_predictions = {}
        for station in test_stations[:5]:  # Limit to first 5 stations
            # Use a simple function based on location
            pred_value = 50 + 10 * np.sin(station.latitude) + 5 * np.cos(station.longitude)
            station_predictions[station.id] = pred_value
        
        # Test interpolation
        try:
            interpolated_values = model.interpolate_grid(station_predictions, grid_points)
            
            interpolation_results = {
                'n_grid_points': len(grid_points),
                'n_station_predictions': len(station_predictions),
                'interpolated_values_range': {
                    'min': float(np.min(interpolated_values)),
                    'max': float(np.max(interpolated_values)),
                    'mean': float(np.mean(interpolated_values)),
                    'std': float(np.std(interpolated_values))
                },
                'grid_bounds': {
                    'min_lat': float(min_lat),
                    'max_lat': float(max_lat),
                    'min_lon': float(min_lon),
                    'max_lon': float(max_lon)
                },
                'resolution_deg': resolution_deg,
                'success': True
            }
            
            logger.info(f"Interpolation test successful: {len(interpolated_values)} grid points")
            return interpolation_results
            
        except Exception as e:
            logger.error(f"Interpolation test failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def save_results(self, model: SpatialGNN, 
                    training_metrics: Dict[str, Any],
                    validation_metrics: Dict[str, Any],
                    interpolation_results: Dict[str, Any]):
        """
        Save training results and model
        
        Args:
            model: Trained model
            training_metrics: Training metrics
            validation_metrics: Validation metrics
            interpolation_results: Interpolation test results
        """
        logger.info("Saving training results")
        
        # Save model
        model_path = os.path.join(self.model_dir, 'gnn_spatial_model.pth')
        model.save_model(model_path)
        
        # Save training results
        results = {
            'timestamp': datetime.now().isoformat(),
            'config': self.config,
            'training_metrics': training_metrics,
            'validation_metrics': validation_metrics,
            'interpolation_results': interpolation_results,
            'model_path': model_path
        }
        
        results_path = os.path.join(self.model_dir, 'training_results.json')
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Results saved to {results_path}")
        logger.info(f"Model saved to {model_path}")
    
    def run_training_pipeline(self, city: str = 'delhi', days: int = 30) -> Dict[str, Any]:
        """
        Run complete GNN training pipeline
        
        Args:
            city: City to train on
            days: Days of training data
            
        Returns:
            Training results
        """
        logger.info(f"Starting GNN training pipeline for {city}")
        
        try:
            # Step 1: Get training stations
            stations = self.get_training_stations(city)
            
            if len(stations) < self.config['min_stations']:
                raise ValueError(f"Need at least {self.config['min_stations']} stations, got {len(stations)}")
            
            # Step 2: Generate training data
            training_data = self.generate_training_data(stations, days)
            
            # Step 3: Spatial train-test split
            train_data, test_data, train_stations, test_stations = self.spatial_train_test_split(
                stations, training_data, self.config['validation_split']
            )
            
            # Step 4: Train model
            model, training_metrics = self.train_model(train_stations, train_data)
            
            # Step 5: Validate model
            validation_metrics = self.validate_model(model, test_data, test_stations)
            
            # Step 6: Test spatial interpolation
            interpolation_results = self.test_spatial_interpolation(model, test_stations)
            
            # Step 7: Save results
            self.save_results(model, training_metrics, validation_metrics, interpolation_results)
            
            # Return summary
            summary = {
                'success': True,
                'city': city,
                'n_stations': len(stations),
                'n_train_stations': len(train_stations),
                'n_test_stations': len(test_stations),
                'training_rmse': training_metrics.get('train_rmse', 0),
                'validation_rmse': validation_metrics.get('rmse', 0),
                'validation_accuracy_20pct': validation_metrics.get('within_20_percent', 0),
                'interpolation_success': interpolation_results.get('success', False),
                'model_path': os.path.join(self.model_dir, 'gnn_spatial_model.pth')
            }
            
            logger.info("GNN training pipeline completed successfully")
            logger.info(f"Training RMSE: {summary['training_rmse']:.2f}")
            logger.info(f"Validation RMSE: {summary['validation_rmse']:.2f}")
            logger.info(f"Validation Accuracy (20%): {summary['validation_accuracy_20pct']:.1f}%")
            
            return summary
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}


def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train GNN spatial model')
    parser.add_argument('--city', default='delhi', help='City to train on')
    parser.add_argument('--days', type=int, default=30, help='Days of training data')
    parser.add_argument('--model-dir', default='models/gnn', help='Model directory')
    parser.add_argument('--epochs', type=int, default=200, help='Training epochs')
    parser.add_argument('--learning-rate', type=float, default=0.01, help='Learning rate')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = GNNTrainer(model_dir=args.model_dir)
    
    # Update config
    trainer.config['epochs'] = args.epochs
    trainer.config['learning_rate'] = args.learning_rate
    
    # Run training
    results = trainer.run_training_pipeline(city=args.city, days=args.days)
    
    if results['success']:
        print(f"\n✅ GNN Training Successful!")
        print(f"City: {results['city']}")
        print(f"Stations: {results['n_stations']} total, {results['n_train_stations']} train, {results['n_test_stations']} test")
        print(f"Training RMSE: {results['training_rmse']:.2f} μg/m³")
        print(f"Validation RMSE: {results['validation_rmse']:.2f} μg/m³")
        print(f"Validation Accuracy (±20%): {results['validation_accuracy_20pct']:.1f}%")
        print(f"Spatial Interpolation: {'✅ Success' if results['interpolation_success'] else '❌ Failed'}")
        print(f"Model saved to: {results['model_path']}")
    else:
        print(f"\n❌ GNN Training Failed: {results.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == '__main__':
    main()