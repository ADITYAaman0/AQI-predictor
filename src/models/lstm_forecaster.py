"""
LSTM Time-Series Forecasting Model for AQI Prediction
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import os
import pickle
import logging

from .mlflow_manager import get_mlflow_manager

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, Model
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logging.warning("TensorFlow not available, LSTM model will not work")
    # Create dummy classes for type hints when TensorFlow is not available
    class Model:
        pass

from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error


class LSTMForecaster:
    """
    LSTM-based time-series forecasting model for air quality prediction
    
    Features:
    - Multi-step ahead predictions (1-24 hours)
    - Confidence interval estimation
    - Model versioning and experiment tracking
    - Integration with existing forecasting service
    """
    
    def __init__(self, sequence_length: int = 24, features: int = 20, 
                 model_path: str = None):
        """
        Initialize LSTM forecaster
        
        Args:
            sequence_length: Number of historical hours to use for prediction
            features: Number of input features
            model_path: Path to saved model
        """
        self.sequence_length = sequence_length
        self.features = features
        self.model_path = model_path
        
        # Model components
        self.model = None
        self.scaler = StandardScaler()
        self.target_scaler = MinMaxScaler()
        self.feature_names = None
        self.is_trained = False
        
        # Model architecture parameters
        self.lstm_units = [64, 32]
        self.dropout_rate = 0.2
        self.learning_rate = 0.001
        
        # Training parameters
        self.batch_size = 32
        self.epochs = 100
        self.validation_split = 0.2
        self.early_stopping_patience = 10
        
        # Load pre-trained model if available
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _build_lstm_model(self) -> Model:
        """
        Build LSTM neural network architecture
        
        Returns:
            Compiled Keras model
        """
        model = Sequential([
            Input(shape=(self.sequence_length, self.features)),
            
            # First LSTM layer
            LSTM(self.lstm_units[0], return_sequences=True, 
                 dropout=self.dropout_rate, recurrent_dropout=self.dropout_rate),
            
            # Second LSTM layer
            LSTM(self.lstm_units[1], return_sequences=False,
                 dropout=self.dropout_rate, recurrent_dropout=self.dropout_rate),
            
            # Dense layers for output
            Dense(32, activation='relu'),
            Dropout(self.dropout_rate),
            Dense(16, activation='relu'),
            Dense(1, activation='linear')  # Single output for PM2.5 prediction
        ])
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def _prepare_sequences(self, data: np.ndarray, target: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare time series data into sequences for LSTM training
        
        Args:
            data: Feature data (n_samples, n_features)
            target: Target values (n_samples,)
            
        Returns:
            Tuple of (X_sequences, y_sequences)
        """
        X_sequences = []
        y_sequences = []
        
        for i in range(self.sequence_length, len(data)):
            # Use previous sequence_length hours as input
            X_sequences.append(data[i-self.sequence_length:i])
            y_sequences.append(target[i])
        
        return np.array(X_sequences), np.array(y_sequences)
    
    def train(self, X: pd.DataFrame, y: pd.Series, 
              validation_data: Optional[Tuple] = None) -> Dict[str, Any]:
        """
        Train the LSTM forecasting model
        
        Args:
            X: Feature DataFrame with datetime index
            y: Target values (PM2.5 concentrations)
            validation_data: Optional (X_val, y_val) tuple
            
        Returns:
            Dictionary with training metrics and history
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM training")
            
        # Store feature names
        self.feature_names = list(X.columns)
        
        # Scale features and target
        X_scaled = self.scaler.fit_transform(X)
        y_scaled = self.target_scaler.fit_transform(y.values.reshape(-1, 1)).flatten()
        
        # Prepare sequences
        X_seq, y_seq = self._prepare_sequences(X_scaled, y_scaled)
        
        if len(X_seq) == 0:
            raise ValueError(f"Not enough data for sequence length {self.sequence_length}")
        
        # Build model
        self.model = self._build_lstm_model()
        
        # Prepare callbacks
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=self.early_stopping_patience,
                restore_best_weights=True
            )
        ]
        
        if self.model_path:
            callbacks.append(
                ModelCheckpoint(
                    self.model_path,
                    monitor='val_loss',
                    save_best_only=True,
                    save_weights_only=False
                )
            )
        
        # Train model
        history = self.model.fit(
            X_seq, y_seq,
            batch_size=self.batch_size,
            epochs=self.epochs,
            validation_split=self.validation_split,
            callbacks=callbacks,
            verbose=1
        )
        
        self.is_trained = True
        
        # Calculate final metrics
        train_pred = self.model.predict(X_seq)
        train_pred_unscaled = self.target_scaler.inverse_transform(train_pred)
        y_unscaled = self.target_scaler.inverse_transform(y_seq.reshape(-1, 1))
        
        train_rmse = np.sqrt(mean_squared_error(y_unscaled, train_pred_unscaled))
        train_mae = mean_absolute_error(y_unscaled, train_pred_unscaled)
        
        training_results = {
            'train_rmse': float(train_rmse),
            'train_mae': float(train_mae),
            'val_loss': float(min(history.history['val_loss'])),
            'val_mae': float(min(history.history['val_mae'])),
            'epochs_trained': len(history.history['loss']),
            'n_sequences': len(X_seq),
            'sequence_length': self.sequence_length,
            'n_features': self.features
        }
        
        # Log training with MLflow
        try:
            mlflow_manager = get_mlflow_manager()
            
            # Prepare training data info
            training_data = {
                "n_samples": len(X_seq),
                "n_features": self.features,
                "period": f"{X.index.min()} to {X.index.max()}" if hasattr(X, 'index') else "unknown"
            }
            
            # Prepare parameters
            parameters = {
                "sequence_length": self.sequence_length,
                "lstm_units_1": self.lstm_units[0],
                "lstm_units_2": self.lstm_units[1],
                "dropout_rate": self.dropout_rate,
                "learning_rate": self.learning_rate,
                "batch_size": self.batch_size,
                "epochs": self.epochs,
                "early_stopping_patience": self.early_stopping_patience
            }
            
            # Log training run
            run_id = mlflow_manager.log_model_training(
                model_type="lstm",
                model=self,
                training_data=training_data,
                metrics=training_results,
                parameters=parameters
            )
            
            training_results['mlflow_run_id'] = run_id
            logging.info(f"LSTM training logged to MLflow: {run_id}")
            
        except Exception as e:
            logging.warning(f"Failed to log LSTM training to MLflow: {e}")
        
        return training_results
    
    def predict(self, X: pd.DataFrame, 
                return_confidence: bool = True,
                n_samples: int = 100) -> Dict[str, Any]:
        """
        Make predictions with uncertainty estimation
        
        Args:
            X: Feature DataFrame
            return_confidence: Whether to return confidence intervals
            n_samples: Number of Monte Carlo samples for uncertainty
            
        Returns:
            Dictionary with predictions and confidence intervals
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        # Ensure correct feature order and dimensions
        if self.feature_names:
            missing = set(self.feature_names) - set(X.columns)
            for col in missing:
                X[col] = 0
            X = X[self.feature_names]
        
        # Check if feature dimensions match
        if X.shape[1] != self.features:
            raise ValueError(f"Feature dimension mismatch: expected {self.features}, got {X.shape[1]}. "
                           f"Expected features: {self.feature_names}")
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Prepare sequences (use last sequence_length points)
        if len(X_scaled) < self.sequence_length:
            # Pad with zeros if not enough data
            padding = np.zeros((self.sequence_length - len(X_scaled), X_scaled.shape[1]))
            X_scaled = np.vstack([padding, X_scaled])
        
        # Take the last sequence_length points
        X_seq = X_scaled[-self.sequence_length:].reshape(1, self.sequence_length, -1)
        
        if return_confidence:
            # Monte Carlo Dropout for uncertainty estimation
            predictions = []
            for _ in range(n_samples):
                # Enable dropout during inference
                pred = self.model(X_seq, training=True)
                predictions.append(pred.numpy().flatten()[0])
            
            predictions = np.array(predictions)
            
            # Calculate statistics
            mean_pred = np.mean(predictions)
            std_pred = np.std(predictions)
            
            # Unscale predictions
            mean_unscaled = self.target_scaler.inverse_transform([[mean_pred]])[0][0]
            lower_bound = self.target_scaler.inverse_transform([[mean_pred - 1.28 * std_pred]])[0][0]
            upper_bound = self.target_scaler.inverse_transform([[mean_pred + 1.28 * std_pred]])[0][0]
            
            return {
                'predictions': np.array([mean_unscaled]),
                'lower_bound': np.array([max(0, lower_bound)]),
                'upper_bound': np.array([upper_bound]),
                'uncertainty': float(std_pred),
                'timestamps': X.index.values if hasattr(X, 'index') else None
            }
        else:
            # Single prediction
            pred_scaled = self.model.predict(X_seq, verbose=0)
            pred_unscaled = self.target_scaler.inverse_transform(pred_scaled)
            
            return {
                'predictions': pred_unscaled.flatten(),
                'timestamps': X.index.values if hasattr(X, 'index') else None
            }
    
    def predict_sequence(self, initial_data: pd.DataFrame, 
                        hours: int = 24) -> List[Dict[str, Any]]:
        """
        Generate multi-step ahead predictions
        
        Args:
            initial_data: Initial sequence data
            hours: Number of hours to predict ahead
            
        Returns:
            List of prediction dictionaries
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        predictions = []
        current_sequence = initial_data.copy()
        
        for h in range(1, hours + 1):
            # Predict next hour
            result = self.predict(current_sequence, return_confidence=True)
            pred_value = result['predictions'][0]
            lower = result['lower_bound'][0]
            upper = result['upper_bound'][0]
            
            # Create prediction record
            forecast_time = datetime.now() + timedelta(hours=h)
            predictions.append({
                'timestamp': forecast_time,
                'hour': h,
                'pm25': round(pred_value, 1),
                'pm25_lower': round(lower, 1),
                'pm25_upper': round(upper, 1),
                'uncertainty': result['uncertainty']
            })
            
            # Update sequence for next prediction
            # This is a simplified approach - in practice, you'd want to
            # incorporate actual weather forecasts and other features
            new_row = current_sequence.iloc[-1:].copy()
            new_row.index = [forecast_time]
            
            # Update some features for next hour (simplified)
            if 'hour' in new_row.columns:
                new_row['hour'] = forecast_time.hour
            if 'pm25_lag1' in new_row.columns:
                new_row['pm25_lag1'] = pred_value
            
            # Append new row and keep only last sequence_length rows
            current_sequence = pd.concat([current_sequence, new_row])
            current_sequence = current_sequence.tail(self.sequence_length)
        
        return predictions
    
    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
        """
        Evaluate model performance on test data
        
        Args:
            X_test: Test features
            y_test: Test targets
            
        Returns:
            Dictionary with evaluation metrics
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before evaluation")
        
        # Ensure correct feature order
        if self.feature_names:
            missing = set(self.feature_names) - set(X_test.columns)
            for col in missing:
                X_test[col] = 0
            X_test = X_test[self.feature_names]
        
        # Scale features
        X_scaled = self.scaler.transform(X_test)
        y_scaled = self.target_scaler.transform(y_test.values.reshape(-1, 1)).flatten()
        
        # Prepare sequences
        X_seq, y_seq = self._prepare_sequences(X_scaled, y_scaled)
        
        if len(X_seq) == 0:
            raise ValueError(f"Not enough test data for sequence length {self.sequence_length}")
        
        # Make predictions
        pred_scaled = self.model.predict(X_seq, verbose=0)
        pred_unscaled = self.target_scaler.inverse_transform(pred_scaled)
        y_unscaled = self.target_scaler.inverse_transform(y_seq.reshape(-1, 1))
        
        predictions = pred_unscaled.flatten()
        actual = y_unscaled.flatten()
        
        # Calculate metrics
        rmse = np.sqrt(mean_squared_error(actual, predictions))
        mae = mean_absolute_error(actual, predictions)
        
        # Calculate accuracy within bounds (for AQI categories)
        # Avoid division by zero
        relative_errors = np.abs(predictions - actual) / np.maximum(actual, 1.0)
        within_10_percent = np.mean(relative_errors <= 0.1) * 100
        within_20_percent = np.mean(relative_errors <= 0.2) * 100
        
        return {
            'rmse': float(rmse),
            'mae': float(mae),
            'within_10_percent': float(within_10_percent),
            'within_20_percent': float(within_20_percent),
            'n_samples': len(actual)
        }
    
    def save_model(self, path: str):
        """Save trained model and scalers"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        # Save Keras model
        model_dir = os.path.dirname(path)
        if model_dir:
            os.makedirs(model_dir, exist_ok=True)
        
        self.model.save(path)
        
        # Save scalers and metadata
        metadata = {
            'scaler': self.scaler,
            'target_scaler': self.target_scaler,
            'feature_names': self.feature_names,
            'sequence_length': self.sequence_length,
            'features': self.features,
            'lstm_units': self.lstm_units,
            'dropout_rate': self.dropout_rate
        }
        
        metadata_path = path.replace('.h5', '_metadata.pkl').replace('.keras', '_metadata.pkl')
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
    
    def load_model(self, path: str):
        """Load trained model and scalers"""
        try:
            # Load Keras model
            self.model = tf.keras.models.load_model(path)
            
            # Load metadata
            metadata_path = path.replace('.h5', '_metadata.pkl').replace('.keras', '_metadata.pkl')
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
            
            self.scaler = metadata['scaler']
            self.target_scaler = metadata['target_scaler']
            self.feature_names = metadata['feature_names']
            self.sequence_length = metadata['sequence_length']
            self.features = metadata['features']
            self.lstm_units = metadata.get('lstm_units', [64, 32])
            self.dropout_rate = metadata.get('dropout_rate', 0.2)
            
            self.is_trained = True
            
        except Exception as e:
            logging.error(f"Error loading LSTM model: {e}")
            raise


# Singleton instance
_lstm_forecaster_instance = None

def get_lstm_forecaster() -> LSTMForecaster:
    """Get or create LSTM forecaster instance"""
    if not TENSORFLOW_AVAILABLE:
        raise ImportError("TensorFlow is required for LSTM forecasting")
    
    global _lstm_forecaster_instance
    if _lstm_forecaster_instance is None:
        _lstm_forecaster_instance = LSTMForecaster()
    return _lstm_forecaster_instance