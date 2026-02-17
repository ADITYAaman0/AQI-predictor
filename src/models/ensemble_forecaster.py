"""
Ensemble Prediction System combining XGBoost, LSTM, and GNN models
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import logging
import json
import os
from dataclasses import dataclass, asdict
import mlflow

from .forecaster import AQIForecaster, get_forecaster
from .lstm_forecaster import LSTMForecaster, get_lstm_forecaster
from .gnn_spatial import SpatialGNN, Station
from .mlflow_manager import get_mlflow_manager
from ..utils.aqi_calculator import AQICalculator


@dataclass
class EnsemblePrediction:
    """Ensemble prediction result"""
    timestamp: datetime
    pm25: float
    pm25_lower: float
    pm25_upper: float
    aqi: int
    category: str
    confidence: float
    model_weights: Dict[str, float]
    individual_predictions: Dict[str, float]
    uncertainty: float


@dataclass
class ModelPerformance:
    """Model performance metrics"""
    rmse: float
    mae: float
    accuracy_1h: float
    accuracy_24h: float
    last_updated: datetime
    sample_count: int


class EnsembleForecaster:
    """
    Ensemble prediction system combining multiple ML models
    
    Features:
    - Weighted averaging with dynamic weight adjustment
    - Confidence interval calculation for ensemble predictions
    - Automated model performance monitoring
    - Fallback mechanisms for model failures
    """
    
    def __init__(self, stations: List[Station] = None, 
                 model_dir: str = "models/ensemble"):
        """
        Initialize ensemble forecaster
        
        Args:
            stations: List of monitoring stations for GNN
            model_dir: Directory to save/load models and metadata
        """
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize individual models
        self.xgboost_model = get_forecaster()
        
        # Initialize LSTM model if available
        try:
            self.lstm_model = get_lstm_forecaster()
        except ImportError:
            logging.warning("LSTM model not available, using XGBoost only")
            self.lstm_model = None
        
        # Initialize GNN model if available and stations provided
        try:
            self.gnn_model = SpatialGNN(stations) if stations else None
        except ImportError:
            logging.warning("GNN model not available")
            self.gnn_model = None
        
        # Model weights (dynamic, updated based on performance)
        self.weights = {
            'xgboost': 0.4,
            'lstm': 0.4,
            'gnn': 0.2
        }
        
        # Performance tracking
        self.performance_history: Dict[str, List[ModelPerformance]] = {
            'xgboost': [],
            'lstm': [],
            'gnn': []
        }
        
        # Configuration
        self.confidence_level = 0.8  # 80% confidence intervals
        self.min_models_required = 1  # Minimum models needed for prediction
        self.performance_window = 100  # Number of recent predictions to consider
        
        # AQI calculator
        self.aqi_calc = AQICalculator()
        
        # Load existing performance data
        self._load_performance_history()
    
    def predict(self, features: pd.DataFrame, 
                station_data: Optional[Dict[str, np.ndarray]] = None,
                return_individual: bool = False) -> EnsemblePrediction:
        """
        Generate ensemble prediction
        
        Args:
            features: Feature DataFrame for prediction
            station_data: Station data for GNN (if available)
            return_individual: Whether to return individual model predictions
            
        Returns:
            EnsemblePrediction object
        """
        individual_predictions = {}
        individual_uncertainties = {}
        available_models = []
        
        # Get XGBoost prediction
        try:
            xgb_result = self.xgboost_model.predict(features, return_confidence=True)
            if 'predictions' in xgb_result and len(xgb_result['predictions']) > 0:
                individual_predictions['xgboost'] = float(xgb_result['predictions'][0])
                if 'lower_bound' in xgb_result and 'upper_bound' in xgb_result:
                    uncertainty = (xgb_result['upper_bound'][0] - xgb_result['lower_bound'][0]) / 2
                    individual_uncertainties['xgboost'] = uncertainty
                available_models.append('xgboost')
        except Exception as e:
            logging.warning(f"XGBoost prediction failed: {e}")
        
        # Get LSTM prediction
        try:
            if self.lstm_model.is_trained:
                lstm_result = self.lstm_model.predict(features, return_confidence=True)
                if 'predictions' in lstm_result and len(lstm_result['predictions']) > 0:
                    individual_predictions['lstm'] = float(lstm_result['predictions'][0])
                    if 'lower_bound' in lstm_result and 'upper_bound' in lstm_result:
                        uncertainty = (lstm_result['upper_bound'][0] - lstm_result['lower_bound'][0]) / 2
                        individual_uncertainties['lstm'] = uncertainty
                    available_models.append('lstm')
        except Exception as e:
            logging.warning(f"LSTM prediction failed: {e}")
        
        # Get GNN prediction
        try:
            if self.gnn_model and self.gnn_model.is_trained and station_data:
                gnn_predictions = self.gnn_model.predict_spatial(station_data)
                if gnn_predictions:
                    # Use average of all station predictions
                    gnn_pred = np.mean(list(gnn_predictions.values()))
                    individual_predictions['gnn'] = float(gnn_pred)
                    # Estimate uncertainty from prediction variance
                    if len(gnn_predictions) > 1:
                        individual_uncertainties['gnn'] = float(np.std(list(gnn_predictions.values())))
                    else:
                        individual_uncertainties['gnn'] = 10.0  # Default uncertainty
                    available_models.append('gnn')
        except Exception as e:
            logging.warning(f"GNN prediction failed: {e}")
        
        if len(available_models) < self.min_models_required:
            raise ValueError(f"Not enough models available for ensemble prediction. "
                           f"Available: {available_models}, Required: {self.min_models_required}")
        
        # Calculate ensemble prediction using weighted average
        ensemble_pred, ensemble_uncertainty = self._calculate_ensemble(
            individual_predictions, individual_uncertainties, available_models
        )
        
        # Calculate confidence intervals
        confidence_multiplier = 1.28 if self.confidence_level == 0.8 else 1.96  # 80% or 95%
        lower_bound = max(0, ensemble_pred - confidence_multiplier * ensemble_uncertainty)
        upper_bound = ensemble_pred + confidence_multiplier * ensemble_uncertainty
        
        # Convert to AQI
        aqi = self.aqi_calc.calculate_sub_index(ensemble_pred, 'pm25')
        category = self.aqi_calc.get_category(aqi)
        
        # Calculate confidence score (inverse of normalized uncertainty)
        max_uncertainty = 50.0  # Maximum expected uncertainty
        confidence = max(0.1, 1.0 - min(ensemble_uncertainty / max_uncertainty, 1.0))
        
        # Get current weights for available models
        current_weights = {model: self.weights[model] for model in available_models}
        
        return EnsemblePrediction(
            timestamp=datetime.now(),
            pm25=round(ensemble_pred, 1),
            pm25_lower=round(lower_bound, 1),
            pm25_upper=round(upper_bound, 1),
            aqi=aqi,
            category=category,
            confidence=round(confidence, 3),
            model_weights=current_weights,
            individual_predictions=individual_predictions if return_individual else {},
            uncertainty=round(ensemble_uncertainty, 2)
        )
    
    def _calculate_ensemble(self, predictions: Dict[str, float], 
                           uncertainties: Dict[str, float],
                           available_models: List[str]) -> Tuple[float, float]:
        """
        Calculate weighted ensemble prediction and uncertainty
        
        Args:
            predictions: Individual model predictions
            uncertainties: Individual model uncertainties
            available_models: List of available model names
            
        Returns:
            Tuple of (ensemble_prediction, ensemble_uncertainty)
        """
        # Normalize weights for available models
        total_weight = sum(self.weights[model] for model in available_models)
        normalized_weights = {
            model: self.weights[model] / total_weight 
            for model in available_models
        }
        
        # Weighted average prediction
        ensemble_pred = sum(
            normalized_weights[model] * predictions[model] 
            for model in available_models
        )
        
        # Ensemble uncertainty using weighted variance
        if len(available_models) == 1:
            # Single model - use its uncertainty
            model = available_models[0]
            ensemble_uncertainty = uncertainties.get(model, 15.0)
        else:
            # Multiple models - combine uncertainties
            weighted_variance = 0.0
            for model in available_models:
                model_uncertainty = uncertainties.get(model, 15.0)
                weight = normalized_weights[model]
                
                # Prediction deviation from ensemble
                pred_deviation = predictions[model] - ensemble_pred
                
                # Combined variance: model uncertainty + prediction disagreement
                model_variance = (model_uncertainty ** 2) + (pred_deviation ** 2)
                weighted_variance += weight * model_variance
            
            ensemble_uncertainty = np.sqrt(weighted_variance)
        
        return ensemble_pred, ensemble_uncertainty
    
    def forecast_sequence(self, initial_features: pd.DataFrame,
                         weather_forecast: List[Dict],
                         station_data: Optional[Dict[str, np.ndarray]] = None,
                         hours: int = 24) -> List[EnsemblePrediction]:
        """
        Generate multi-step ensemble forecast
        
        Args:
            initial_features: Initial feature data
            weather_forecast: Weather forecast data
            station_data: Station data for GNN
            hours: Number of hours to forecast
            
        Returns:
            List of EnsemblePrediction objects
        """
        forecasts = []
        current_features = initial_features.copy()
        
        for h in range(1, hours + 1):
            forecast_time = datetime.now() + timedelta(hours=h)
            
            # Update features for current hour
            if h <= len(weather_forecast):
                weather = weather_forecast[h-1]
                # Update weather features
                for key, value in weather.items():
                    if key in current_features.columns:
                        current_features.loc[current_features.index[-1], key] = value
            
            # Update time-based features
            if 'hour' in current_features.columns:
                current_features.loc[current_features.index[-1], 'hour'] = forecast_time.hour
            if 'day_of_week' in current_features.columns:
                current_features.loc[current_features.index[-1], 'day_of_week'] = forecast_time.weekday()
            
            # Make ensemble prediction
            try:
                prediction = self.predict(current_features, station_data, return_individual=True)
                prediction.timestamp = forecast_time
                forecasts.append(prediction)
                
                # Update features with prediction for next iteration
                if 'pm25_lag1' in current_features.columns:
                    current_features.loc[current_features.index[-1], 'pm25_lag1'] = prediction.pm25
                
            except Exception as e:
                logging.error(f"Ensemble forecast failed at hour {h}: {e}")
                # Create fallback prediction
                fallback_pred = EnsemblePrediction(
                    timestamp=forecast_time,
                    pm25=100.0,  # Default moderate pollution
                    pm25_lower=80.0,
                    pm25_upper=120.0,
                    aqi=101,
                    category='moderate',
                    confidence=0.1,
                    model_weights={},
                    individual_predictions={},
                    uncertainty=20.0
                )
                forecasts.append(fallback_pred)
        
        return forecasts
    
    def update_weights(self, validation_scores: Dict[str, ModelPerformance]):
        """
        Update ensemble weights based on recent model performance
        
        Args:
            validation_scores: Dict mapping model name to performance metrics
        """
        # Calculate performance-based weights
        # Better performing models (lower RMSE) get higher weights
        
        total_inverse_rmse = 0.0
        model_scores = {}
        
        for model_name, performance in validation_scores.items():
            if model_name in self.weights:
                # Use inverse RMSE as performance score
                inverse_rmse = 1.0 / max(performance.rmse, 1.0)  # Avoid division by zero
                model_scores[model_name] = inverse_rmse
                total_inverse_rmse += inverse_rmse
        
        if total_inverse_rmse > 0:
            # Update weights based on relative performance
            for model_name in self.weights:
                if model_name in model_scores:
                    self.weights[model_name] = model_scores[model_name] / total_inverse_rmse
                else:
                    # Model not available, reduce weight
                    self.weights[model_name] *= 0.5
            
            # Ensure weights sum to 1
            total_weight = sum(self.weights.values())
            if total_weight > 0:
                for model_name in self.weights:
                    self.weights[model_name] /= total_weight
        
        # Store performance history
        for model_name, performance in validation_scores.items():
            if model_name in self.performance_history:
                self.performance_history[model_name].append(performance)
                # Keep only recent performance data
                if len(self.performance_history[model_name]) > self.performance_window:
                    self.performance_history[model_name] = \
                        self.performance_history[model_name][-self.performance_window:]
        
        # Log ensemble weight update to MLflow
        try:
            mlflow_manager = get_mlflow_manager()
            
            # Prepare metrics for logging
            ensemble_metrics = {
                f"weight_{model}": weight for model, weight in self.weights.items()
            }
            
            # Add performance metrics
            for model_name, performance in validation_scores.items():
                ensemble_metrics[f"{model_name}_rmse"] = performance.rmse
                ensemble_metrics[f"{model_name}_mae"] = performance.mae
            
            # Log ensemble update
            with mlflow_manager.start_run(
                run_name=f"ensemble_weight_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                tags={"model_type": "ensemble", "run_type": "weight_update"}
            ) as run:
                mlflow.log_metrics(ensemble_metrics)
                
                # Log current weights as parameters
                mlflow.log_params({f"current_weight_{model}": weight 
                                 for model, weight in self.weights.items()})
            
            logging.info(f"Ensemble weight update logged to MLflow")
            
        except Exception as e:
            logging.warning(f"Failed to log ensemble update to MLflow: {e}")
        
        # Save updated weights and performance
        self._save_performance_history()
        
        logging.info(f"Updated ensemble weights: {self.weights}")
    
    def evaluate_ensemble(self, test_features: pd.DataFrame, 
                         test_targets: pd.Series,
                         station_data: Optional[Dict[str, np.ndarray]] = None) -> Dict[str, Any]:
        """
        Evaluate ensemble performance on test data
        
        Args:
            test_features: Test feature data
            test_targets: Test target values
            station_data: Station data for GNN
            
        Returns:
            Dictionary with evaluation metrics
        """
        predictions = []
        individual_rmse = {'xgboost': [], 'lstm': [], 'gnn': []}
        
        for i in range(len(test_features)):
            try:
                # Get single row for prediction
                features_row = test_features.iloc[i:i+1]
                
                # Make ensemble prediction
                ensemble_pred = self.predict(features_row, station_data, return_individual=True)
                predictions.append(ensemble_pred.pm25)
                
                # Track individual model performance
                actual = test_targets.iloc[i]
                for model_name, pred_value in ensemble_pred.individual_predictions.items():
                    error = abs(pred_value - actual)
                    individual_rmse[model_name].append(error ** 2)
                
            except Exception as e:
                logging.warning(f"Evaluation failed for sample {i}: {e}")
                predictions.append(test_targets.iloc[i])  # Use actual as fallback
        
        # Calculate ensemble metrics
        predictions = np.array(predictions)
        ensemble_rmse = np.sqrt(np.mean((predictions - test_targets) ** 2))
        ensemble_mae = np.mean(np.abs(predictions - test_targets))
        
        # Calculate individual model RMSE
        individual_metrics = {}
        for model_name, errors in individual_rmse.items():
            if errors:
                individual_metrics[f'{model_name}_rmse'] = np.sqrt(np.mean(errors))
        
        # Calculate accuracy within bounds
        within_10_percent = np.mean(np.abs(predictions - test_targets) / test_targets <= 0.1) * 100
        within_20_percent = np.mean(np.abs(predictions - test_targets) / test_targets <= 0.2) * 100
        
        return {
            'ensemble_rmse': float(ensemble_rmse),
            'ensemble_mae': float(ensemble_mae),
            'within_10_percent': float(within_10_percent),
            'within_20_percent': float(within_20_percent),
            'current_weights': self.weights.copy(),
            'individual_metrics': individual_metrics,
            'n_samples': len(test_targets)
        }
    
    def get_model_status(self) -> Dict[str, Any]:
        """
        Get current status of all models in the ensemble
        
        Returns:
            Dictionary with model status information
        """
        status = {
            'ensemble_weights': self.weights.copy(),
            'models': {}
        }
        
        # XGBoost status
        status['models']['xgboost'] = {
            'available': True,
            'trained': self.xgboost_model.is_trained,
            'type': 'gradient_boosting'
        }
        
        # LSTM status
        status['models']['lstm'] = {
            'available': self.lstm_model is not None,
            'trained': self.lstm_model.is_trained if self.lstm_model else False,
            'type': 'deep_learning'
        }
        
        # GNN status
        status['models']['gnn'] = {
            'available': self.gnn_model is not None,
            'trained': self.gnn_model.is_trained if self.gnn_model else False,
            'type': 'graph_neural_network',
            'num_stations': len(self.gnn_model.stations) if self.gnn_model else 0
        }
        
        # Recent performance
        if self.performance_history:
            status['recent_performance'] = {}
            for model_name, history in self.performance_history.items():
                if history:
                    latest = history[-1]
                    status['recent_performance'][model_name] = {
                        'rmse': latest.rmse,
                        'mae': latest.mae,
                        'last_updated': latest.last_updated.isoformat()
                    }
        
        return status
    
    def _save_performance_history(self):
        """Save performance history and weights to disk"""
        try:
            data = {
                'weights': self.weights,
                'performance_history': {}
            }
            
            # Convert performance history to serializable format
            for model_name, history in self.performance_history.items():
                data['performance_history'][model_name] = [
                    {
                        **asdict(perf),
                        'last_updated': perf.last_updated.isoformat()
                    }
                    for perf in history
                ]
            
            filepath = os.path.join(self.model_dir, 'ensemble_metadata.json')
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            logging.error(f"Failed to save ensemble metadata: {e}")
    
    def _load_performance_history(self):
        """Load performance history and weights from disk"""
        try:
            filepath = os.path.join(self.model_dir, 'ensemble_metadata.json')
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                # Load weights
                if 'weights' in data:
                    self.weights.update(data['weights'])
                
                # Load performance history
                if 'performance_history' in data:
                    for model_name, history in data['performance_history'].items():
                        self.performance_history[model_name] = [
                            ModelPerformance(
                                rmse=perf['rmse'],
                                mae=perf['mae'],
                                accuracy_1h=perf['accuracy_1h'],
                                accuracy_24h=perf['accuracy_24h'],
                                last_updated=datetime.fromisoformat(perf['last_updated']),
                                sample_count=perf['sample_count']
                            )
                            for perf in history
                        ]
                
                logging.info("Loaded ensemble metadata from disk")
                
        except Exception as e:
            logging.warning(f"Failed to load ensemble metadata: {e}")


# Singleton instance
_ensemble_forecaster_instance = None

def get_ensemble_forecaster(stations: List[Station] = None) -> EnsembleForecaster:
    """Get or create ensemble forecaster instance"""
    global _ensemble_forecaster_instance
    if _ensemble_forecaster_instance is None:
        _ensemble_forecaster_instance = EnsembleForecaster(stations)
    return _ensemble_forecaster_instance