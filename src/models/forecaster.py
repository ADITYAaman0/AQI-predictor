"""
AQI Forecaster - XGBoost-based air quality prediction model
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import os

# Try to import XGBoost, fall back to simpler model if not available
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("XGBoost not available, using simplified forecast model")

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import pickle


class AQIForecaster:
    """
    XGBoost-based AQI forecasting model
    
    Provides:
    - Nowcast (1-3 hour predictions)
    - 24-hour forecast with hourly resolution
    - Confidence intervals
    """
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False
        
        # Model parameters
        self.params = {
            'n_estimators': 100,
            'max_depth': 6,
            'learning_rate': 0.1,
            'subsample': 0.8,
            'random_state': 42
        }
        
        # Load pre-trained model if available
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _create_model(self):
        """Create the forecasting model"""
        if XGBOOST_AVAILABLE:
            return xgb.XGBRegressor(
                objective='reg:squarederror',
                n_estimators=self.params['n_estimators'],
                max_depth=self.params['max_depth'],
                learning_rate=self.params['learning_rate'],
                subsample=self.params['subsample'],
                random_state=self.params['random_state'],
                n_jobs=-1
            )
        else:
            return GradientBoostingRegressor(
                n_estimators=self.params['n_estimators'],
                max_depth=self.params['max_depth'],
                learning_rate=self.params['learning_rate'],
                subsample=self.params['subsample'],
                random_state=self.params['random_state']
            )
    
    def train(self, X: pd.DataFrame, y: pd.Series, 
              validation_split: float = 0.2) -> Dict[str, float]:
        """
        Train the forecasting model
        
        Args:
            X: Feature DataFrame
            y: Target values (PM2.5 or AQI)
            validation_split: Fraction for validation
            
        Returns:
            Dictionary with training metrics
        """
        # Store feature names
        self.feature_names = list(X.columns)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train/validation split (time-aware)
        split_idx = int(len(X) * (1 - validation_split))
        X_train, X_val = X_scaled[:split_idx], X_scaled[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        # Create and train model
        self.model = self._create_model()
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_pred = self.model.predict(X_train)
        val_pred = self.model.predict(X_val)
        
        train_rmse = np.sqrt(np.mean((y_train - train_pred) ** 2))
        val_rmse = np.sqrt(np.mean((y_val - val_pred) ** 2))
        
        self.is_trained = True
        
        return {
            'train_rmse': train_rmse,
            'val_rmse': val_rmse,
            'n_samples': len(X),
            'n_features': len(self.feature_names)
        }
    
    def predict(self, X: pd.DataFrame, 
                return_confidence: bool = True) -> Dict[str, Any]:
        """
        Make predictions with optional confidence intervals
        
        Args:
            X: Feature DataFrame
            return_confidence: Whether to return confidence intervals
            
        Returns:
            Dictionary with predictions and metadata
        """
        if not self.is_trained and self.model is None:
            # Use simple rule-based prediction if no trained model
            return self._rule_based_predict(X, return_confidence)
        
        # Ensure correct feature order
        if self.feature_names:
            missing = set(self.feature_names) - set(X.columns)
            for col in missing:
                X[col] = 0
            X = X[self.feature_names]
        
        # Scale and predict
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        
        result = {
            'predictions': predictions,
            'timestamps': X['timestamp'].values if 'timestamp' in X.columns else None
        }
        
        if return_confidence:
            # Estimate confidence intervals using prediction variance
            # This is a simplified approach - more sophisticated methods exist
            std = np.std(predictions) * 0.2 + 10  # Base uncertainty
            result['lower_bound'] = predictions - 1.28 * std  # 80% CI
            result['upper_bound'] = predictions + 1.28 * std
        
        return result
    
    def _rule_based_predict(self, X: pd.DataFrame, 
                            return_confidence: bool = True) -> Dict[str, Any]:
        """
        Simple rule-based prediction when no trained model available
        Uses patterns from current values and time of day
        """
        predictions = []
        
        # Get baseline from current values
        baseline = X.get('pm25_current', pd.Series([100])).iloc[0] if 'pm25_current' in X.columns else 100
        
        for idx, row in X.iterrows():
            hour = row.get('hour', 12)
            is_rush = row.get('is_rush_hour', 0)
            
            # Apply time-of-day pattern
            # Higher in morning/evening, lower at night
            hour_factor = 1 + 0.2 * np.sin(2 * np.pi * (hour - 8) / 24)
            rush_factor = 1.15 if is_rush else 1.0
            
            # Weather effects
            wind = row.get('wind_speed', 3)
            wind_factor = max(0.7, 1 - wind * 0.03)  # Higher wind = lower pollution
            
            humidity = row.get('humidity', 50)
            humidity_factor = 1 + (humidity - 50) * 0.003
            
            # Combine factors
            pred = baseline * hour_factor * rush_factor * wind_factor * humidity_factor
            
            # Add some randomness for realism
            pred *= (1 + np.random.uniform(-0.05, 0.05))
            
            predictions.append(max(0, pred))
        
        predictions = np.array(predictions)
        
        result = {
            'predictions': predictions,
            'timestamps': X['timestamp'].values if 'timestamp' in X.columns else None
        }
        
        if return_confidence:
            # Wider confidence intervals for rule-based predictions
            std = np.std(predictions) * 0.3 + 15
            result['lower_bound'] = np.maximum(0, predictions - 1.28 * std)
            result['upper_bound'] = predictions + 1.28 * std
        
        return result
    
    def forecast(self, current_data: Dict, weather_forecast: List[Dict],
                 hours: int = 24) -> List[Dict]:
        """
        Generate hourly forecast
        
        Args:
            current_data: Current AQI and weather data
            weather_forecast: List of weather forecast dicts
            hours: Number of hours to forecast
            
        Returns:
            List of hourly forecast dictionaries
        """
        from ..utils.aqi_calculator import AQICalculator
        calc = AQICalculator()
        
        forecasts = []
        now = datetime.now()
        
        # Get current PM2.5 as baseline
        current_pm25 = current_data.get('pollutants', {}).get('pm25', 100)
        
        for h in range(1, hours + 1):
            forecast_time = now + timedelta(hours=h)
            
            # Get weather for this hour
            weather_idx = min(h // 3, len(weather_forecast) - 1) if weather_forecast else 0
            weather = weather_forecast[weather_idx] if weather_forecast else {}
            
            # Create feature row
            features = pd.DataFrame([{
                'timestamp': forecast_time,
                'hour': forecast_time.hour,
                'day_of_week': forecast_time.weekday(),
                'is_weekend': 1 if forecast_time.weekday() >= 5 else 0,
                'is_rush_hour': 1 if (8 <= forecast_time.hour <= 10 or 17 <= forecast_time.hour <= 20) else 0,
                'hour_sin': np.sin(2 * np.pi * forecast_time.hour / 24),
                'hour_cos': np.cos(2 * np.pi * forecast_time.hour / 24),
                'temperature': weather.get('temperature', 25),
                'humidity': weather.get('humidity', 50),
                'wind_speed': weather.get('wind_speed', 3),
                'pressure': weather.get('pressure', 1013),
                'pm25_current': current_pm25
            }])
            
            # Predict
            result = self.predict(features)
            pm25_pred = float(result['predictions'][0])
            lower = float(result.get('lower_bound', [pm25_pred * 0.8])[0])
            upper = float(result.get('upper_bound', [pm25_pred * 1.2])[0])
            
            # Calculate AQI from PM2.5
            aqi = calc.calculate_sub_index(pm25_pred, 'pm25')
            aqi_lower = calc.calculate_sub_index(max(0, lower), 'pm25')
            aqi_upper = calc.calculate_sub_index(upper, 'pm25')
            
            forecasts.append({
                'timestamp': forecast_time,
                'hour': h,
                'pm25': round(pm25_pred, 1),
                'pm25_lower': round(max(0, lower), 1),
                'pm25_upper': round(upper, 1),
                'aqi': aqi,
                'aqi_lower': aqi_lower,
                'aqi_upper': aqi_upper,
                'category': calc.get_category(aqi),
                'category_label': calc.get_category_label(aqi),
                'color': calc.get_color(aqi),
                'temperature': weather.get('temperature', 25),
                'humidity': weather.get('humidity', 50),
                'wind_speed': weather.get('wind_speed', 3)
            })
            
            # Update baseline for next prediction (slight decay toward mean)
            current_pm25 = pm25_pred * 0.95 + current_pm25 * 0.05
        
        return forecasts
    
    def save_model(self, path: str):
        """Save trained model to disk"""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'params': self.params
        }
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, path: str):
        """Load trained model from disk"""
        try:
            with open(path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_names = model_data['feature_names']
            self.params = model_data['params']
            self.is_trained = True
        except Exception as e:
            print(f"Error loading model: {e}")


# Singleton
_forecaster_instance = None

def get_forecaster() -> AQIForecaster:
    """Get or create forecaster instance"""
    global _forecaster_instance
    if _forecaster_instance is None:
        _forecaster_instance = AQIForecaster()
    return _forecaster_instance
