"""
Graph Neural Network for Spatial Air Quality Predictions
"""

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Union
import os
import pickle
import logging
from dataclasses import dataclass

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch_geometric.nn import GCNConv, GATConv, global_mean_pool
    from torch_geometric.data import Data, Batch
    from torch_geometric.utils import to_networkx
    import torch_geometric
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("PyTorch Geometric not available, GNN model will not work")
    # Create dummy classes for type hints when PyTorch is not available
    class Data:
        pass
    class nn:
        class Module:
            pass
        class ModuleList:
            pass
        class Dropout:
            pass
        class BatchNorm1d:
            pass

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from scipy.spatial.distance import pdist, squareform
from scipy.stats import pearsonr

from .mlflow_manager import get_mlflow_manager


@dataclass
class Station:
    """Monitoring station information"""
    id: str
    name: str
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    station_type: Optional[str] = None


class SpatialGNN:
    """
    Graph Neural Network for spatial air quality prediction
    
    Features:
    - Station adjacency matrix based on distance and correlation
    - Spatial interpolation using GNN predictions
    - Multi-pollutant support
    - Uncertainty quantification
    """
    
    def __init__(self, stations: List[Station], hidden_dim: int = 64, 
                 num_layers: int = 3, model_path: str = None):
        """
        Initialize Spatial GNN
        
        Args:
            stations: List of monitoring stations
            hidden_dim: Hidden layer dimension
            num_layers: Number of GNN layers
            model_path: Path to saved model
        """
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch Geometric is required for GNN spatial predictions")
        
        self.stations = {station.id: station for station in stations}
        self.station_ids = list(self.stations.keys())
        self.num_stations = len(stations)
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.model_path = model_path
        
        # Model components
        self.model = None
        self.scaler = StandardScaler()
        self.adjacency_matrix = None
        self.edge_index = None
        self.edge_weights = None
        self.feature_names = None
        self.is_trained = False
        
        # Device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Build spatial graph
        self._build_station_graph()
        
        # Load pre-trained model if available
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _build_station_graph(self):
        """Build spatial adjacency matrix based on distance and correlation"""
        if self.num_stations < 2:
            logging.warning("Need at least 2 stations for spatial graph")
            return
        
        # Calculate distance matrix
        coords = np.array([[s.latitude, s.longitude] for s in self.stations.values()])
        distances = squareform(pdist(coords, metric='euclidean'))
        
        # Convert to adjacency matrix using distance threshold
        # Connect stations within ~50km (roughly 0.5 degrees)
        distance_threshold = 0.5
        distance_adj = (distances < distance_threshold) & (distances > 0)
        
        # For now, use distance-based adjacency
        # In practice, you'd also incorporate correlation from historical data
        self.adjacency_matrix = distance_adj.astype(float)
        
        # Add distance-based weights (closer stations have higher weights)
        for i in range(self.num_stations):
            for j in range(self.num_stations):
                if distance_adj[i, j]:
                    # Inverse distance weighting
                    self.adjacency_matrix[i, j] = 1.0 / (1.0 + distances[i, j])
        
        # Convert to PyTorch Geometric format
        edge_indices = np.where(self.adjacency_matrix > 0)
        self.edge_index = torch.tensor(np.vstack(edge_indices), dtype=torch.long)
        self.edge_weights = torch.tensor(
            self.adjacency_matrix[edge_indices], dtype=torch.float32
        )
        
        logging.info(f"Built spatial graph with {len(edge_indices[0])} edges")
    
    def update_adjacency_with_correlation(self, historical_data: pd.DataFrame,
                                        correlation_threshold: float = 0.3):
        """
        Update adjacency matrix using historical correlation data
        
        Args:
            historical_data: DataFrame with columns [timestamp, station_id, pm25]
            correlation_threshold: Minimum correlation to create edge
        """
        # Pivot data to get station correlations
        pivot_data = historical_data.pivot(
            index='timestamp', columns='station_id', values='pm25'
        )
        
        # Calculate correlation matrix
        corr_matrix = pivot_data.corr().fillna(0)
        
        # Combine distance and correlation
        combined_adj = np.zeros_like(self.adjacency_matrix)
        
        for i, station_i in enumerate(self.station_ids):
            for j, station_j in enumerate(self.station_ids):
                if i != j:
                    # Distance component
                    dist_weight = self.adjacency_matrix[i, j]
                    
                    # Correlation component
                    if station_i in corr_matrix.columns and station_j in corr_matrix.columns:
                        corr_weight = max(0, corr_matrix.loc[station_i, station_j])
                    else:
                        corr_weight = 0
                    
                    # Combine (weighted average)
                    if dist_weight > 0 or corr_weight > correlation_threshold:
                        combined_adj[i, j] = 0.6 * dist_weight + 0.4 * corr_weight
        
        # Update adjacency matrix and edge information
        self.adjacency_matrix = combined_adj
        edge_indices = np.where(self.adjacency_matrix > 0)
        self.edge_index = torch.tensor(np.vstack(edge_indices), dtype=torch.long)
        self.edge_weights = torch.tensor(
            self.adjacency_matrix[edge_indices], dtype=torch.float32
        )
        
        logging.info(f"Updated spatial graph with correlation, {len(edge_indices[0])} edges")
    
    def _build_gnn_model(self, input_dim: int) -> nn.Module:
        """
        Build Graph Neural Network model
        
        Args:
            input_dim: Number of input features per node
            
        Returns:
            PyTorch GNN model
        """
        class SpatialGNNModel(nn.Module):
            def __init__(self, input_dim, hidden_dim, num_layers):
                super().__init__()
                self.num_layers = num_layers
                
                # Graph convolution layers
                self.convs = nn.ModuleList()
                self.convs.append(GCNConv(input_dim, hidden_dim))
                
                for _ in range(num_layers - 2):
                    self.convs.append(GCNConv(hidden_dim, hidden_dim))
                
                self.convs.append(GCNConv(hidden_dim, 1))  # Output layer
                
                # Dropout for regularization
                self.dropout = nn.Dropout(0.2)
                
                # Batch normalization
                self.batch_norms = nn.ModuleList()
                for _ in range(num_layers - 1):
                    self.batch_norms.append(nn.BatchNorm1d(hidden_dim))
            
            def forward(self, x, edge_index, edge_weight=None):
                # Apply graph convolutions
                for i, conv in enumerate(self.convs[:-1]):
                    x = conv(x, edge_index, edge_weight)
                    x = self.batch_norms[i](x)
                    x = F.relu(x)
                    x = self.dropout(x)
                
                # Final layer (no activation for regression)
                x = self.convs[-1](x, edge_index, edge_weight)
                return x
        
        return SpatialGNNModel(input_dim, self.hidden_dim, self.num_layers)
    
    def train(self, station_data: Dict[str, pd.DataFrame], 
              target_column: str = 'pm25',
              epochs: int = 200,
              learning_rate: float = 0.01) -> Dict[str, Any]:
        """
        Train the GNN model
        
        Args:
            station_data: Dict mapping station_id to DataFrame with features and target
            target_column: Name of target column
            epochs: Number of training epochs
            learning_rate: Learning rate
            
        Returns:
            Training metrics
        """
        # Prepare training data
        train_data = self._prepare_training_data(station_data, target_column)
        
        if not train_data:
            raise ValueError("No valid training data available")
        
        # Get input dimension
        sample_features = next(iter(train_data.values()))['features']
        input_dim = sample_features.shape[1]
        self.feature_names = list(station_data[list(station_data.keys())[0]].columns)
        self.feature_names.remove(target_column)
        
        # Build model
        self.model = self._build_gnn_model(input_dim).to(self.device)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        criterion = nn.MSELoss()
        
        # Training loop
        self.model.train()
        train_losses = []
        
        for epoch in range(epochs):
            epoch_losses = []
            
            # Process each time step
            for timestamp in self._get_common_timestamps(train_data):
                # Create graph data for this timestamp
                graph_data = self._create_graph_data(train_data, timestamp)
                
                if graph_data is None:
                    continue
                
                # Forward pass
                optimizer.zero_grad()
                predictions = self.model(
                    graph_data.x, 
                    graph_data.edge_index, 
                    graph_data.edge_attr
                )
                
                # Calculate loss
                loss = criterion(predictions.squeeze(), graph_data.y)
                
                # Backward pass
                loss.backward()
                optimizer.step()
                
                epoch_losses.append(loss.item())
            
            if epoch_losses:
                avg_loss = np.mean(epoch_losses)
                train_losses.append(avg_loss)
                
                if epoch % 20 == 0:
                    logging.info(f"Epoch {epoch}, Loss: {avg_loss:.4f}")
        
        self.is_trained = True
        
        # Calculate final metrics
        final_rmse = np.sqrt(train_losses[-1]) if train_losses else 0
        
        training_results = {
            'train_rmse': float(final_rmse),
            'final_loss': float(train_losses[-1]) if train_losses else 0,
            'epochs_trained': epochs,
            'n_stations': self.num_stations,
            'n_edges': len(self.edge_index[0]) if self.edge_index is not None else 0
        }
        
        # Log training with MLflow
        try:
            mlflow_manager = get_mlflow_manager()
            
            # Prepare training data info
            training_data = {
                "n_samples": sum(len(data['features']) for data in train_data.values()),
                "n_features": input_dim,
                "n_stations": self.num_stations,
                "period": "historical_data"
            }
            
            # Prepare parameters
            parameters = {
                "hidden_dim": self.hidden_dim,
                "num_layers": self.num_layers,
                "learning_rate": learning_rate,
                "epochs": epochs,
                "n_stations": self.num_stations,
                "n_edges": len(self.edge_index[0]) if self.edge_index is not None else 0
            }
            
            # Log training run
            run_id = mlflow_manager.log_model_training(
                model_type="gnn",
                model=self,
                training_data=training_data,
                metrics=training_results,
                parameters=parameters
            )
            
            training_results['mlflow_run_id'] = run_id
            logging.info(f"GNN training logged to MLflow: {run_id}")
            
        except Exception as e:
            logging.warning(f"Failed to log GNN training to MLflow: {e}")
        
        return training_results
    
    def _prepare_training_data(self, station_data: Dict[str, pd.DataFrame], 
                              target_column: str) -> Dict[str, Dict]:
        """Prepare training data from station DataFrames"""
        prepared_data = {}
        
        for station_id, df in station_data.items():
            if station_id not in self.stations:
                continue
            
            if target_column not in df.columns:
                continue
            
            # Separate features and target
            feature_cols = [col for col in df.columns if col not in [target_column, 'timestamp']]
            features = df[feature_cols].values
            targets = df[target_column].values
            
            # Scale features
            if len(features) > 0:
                features_scaled = self.scaler.fit_transform(features)
                
                prepared_data[station_id] = {
                    'features': features_scaled,
                    'targets': targets,
                    'timestamps': df.index if hasattr(df, 'index') else range(len(df))
                }
        
        return prepared_data
    
    def _get_common_timestamps(self, train_data: Dict) -> List:
        """Get timestamps common to all stations"""
        if not train_data:
            return []
        
        # For simplicity, use indices (in practice, you'd align by actual timestamps)
        min_length = min(len(data['features']) for data in train_data.values())
        return list(range(min_length))
    
    def _create_graph_data(self, train_data: Dict, timestamp_idx: int) -> Optional[Data]:
        """Create PyTorch Geometric Data object for a specific timestamp"""
        node_features = []
        node_targets = []
        valid_stations = []
        
        for station_id in self.station_ids:
            if station_id in train_data:
                data = train_data[station_id]
                if timestamp_idx < len(data['features']):
                    node_features.append(data['features'][timestamp_idx])
                    node_targets.append(data['targets'][timestamp_idx])
                    valid_stations.append(station_id)
        
        if len(node_features) < 2:
            return None
        
        # Create tensors
        x = torch.tensor(np.array(node_features), dtype=torch.float32).to(self.device)
        y = torch.tensor(np.array(node_targets), dtype=torch.float32).to(self.device)
        
        # Filter edges for valid stations
        valid_indices = [i for i, sid in enumerate(self.station_ids) if sid in valid_stations]
        edge_index_filtered = []
        edge_weights_filtered = []
        
        if self.edge_index is not None:
            for i, (src, dst) in enumerate(self.edge_index.t()):
                if src.item() in valid_indices and dst.item() in valid_indices:
                    new_src = valid_indices.index(src.item())
                    new_dst = valid_indices.index(dst.item())
                    edge_index_filtered.append([new_src, new_dst])
                    edge_weights_filtered.append(self.edge_weights[i].item())
        
        if edge_index_filtered:
            edge_index = torch.tensor(edge_index_filtered, dtype=torch.long).t().to(self.device)
            edge_attr = torch.tensor(edge_weights_filtered, dtype=torch.float32).to(self.device)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long).to(self.device)
            edge_attr = torch.empty(0, dtype=torch.float32).to(self.device)
        
        return Data(x=x, y=y, edge_index=edge_index, edge_attr=edge_attr)
    
    def predict_spatial(self, station_data: Dict[str, np.ndarray]) -> Dict[str, float]:
        """
        Predict values for all stations using spatial relationships
        
        Args:
            station_data: Dict mapping station_id to feature array
            
        Returns:
            Dict mapping station_id to predicted value
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare input data
        node_features = []
        valid_stations = []
        
        for station_id in self.station_ids:
            if station_id in station_data:
                features = station_data[station_id]
                if len(features) == len(self.feature_names):
                    # Scale features
                    features_scaled = self.scaler.transform(features.reshape(1, -1))[0]
                    node_features.append(features_scaled)
                    valid_stations.append(station_id)
        
        if len(node_features) < 1:
            return {}
        
        # Create graph data
        x = torch.tensor(np.array(node_features), dtype=torch.float32).to(self.device)
        
        # Filter edges for valid stations
        valid_indices = [i for i, sid in enumerate(self.station_ids) if sid in valid_stations]
        edge_index_filtered = []
        edge_weights_filtered = []
        
        if self.edge_index is not None:
            for i, (src, dst) in enumerate(self.edge_index.t()):
                if src.item() in valid_indices and dst.item() in valid_indices:
                    new_src = valid_indices.index(src.item())
                    new_dst = valid_indices.index(dst.item())
                    edge_index_filtered.append([new_src, new_dst])
                    edge_weights_filtered.append(self.edge_weights[i].item())
        
        if edge_index_filtered:
            edge_index = torch.tensor(edge_index_filtered, dtype=torch.long).t().to(self.device)
            edge_attr = torch.tensor(edge_weights_filtered, dtype=torch.float32).to(self.device)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long).to(self.device)
            edge_attr = torch.empty(0, dtype=torch.float32).to(self.device)
        
        # Make predictions
        self.model.eval()
        with torch.no_grad():
            predictions = self.model(x, edge_index, edge_attr)
        
        # Return results
        results = {}
        for i, station_id in enumerate(valid_stations):
            results[station_id] = float(predictions[i].cpu().numpy())
        
        return results
    
    def interpolate_grid(self, station_predictions: Dict[str, float], 
                        grid_points: List[Tuple[float, float]],
                        method: str = 'idw') -> List[float]:
        """
        Interpolate predictions to regular grid using spatial relationships
        
        Args:
            station_predictions: Dict mapping station_id to predicted value
            grid_points: List of (lat, lon) tuples for grid points
            method: Interpolation method ('idw' for inverse distance weighting)
            
        Returns:
            List of interpolated values for grid points
        """
        if not station_predictions:
            return [0.0] * len(grid_points)
        
        # Get station coordinates and values
        station_coords = []
        station_values = []
        
        for station_id, value in station_predictions.items():
            if station_id in self.stations:
                station = self.stations[station_id]
                station_coords.append([station.latitude, station.longitude])
                station_values.append(value)
        
        if not station_coords:
            return [0.0] * len(grid_points)
        
        station_coords = np.array(station_coords)
        station_values = np.array(station_values)
        
        # Interpolate to grid points
        interpolated = []
        
        for grid_lat, grid_lon in grid_points:
            if method == 'idw':
                # Inverse distance weighting
                distances = np.sqrt(
                    (station_coords[:, 0] - grid_lat) ** 2 + 
                    (station_coords[:, 1] - grid_lon) ** 2
                )
                
                # Avoid division by zero
                distances = np.maximum(distances, 1e-10)
                
                # Calculate weights (inverse distance squared)
                weights = 1.0 / (distances ** 2)
                weights /= np.sum(weights)
                
                # Weighted average
                interpolated_value = np.sum(weights * station_values)
                interpolated.append(float(interpolated_value))
            else:
                # Simple nearest neighbor
                nearest_idx = np.argmin(
                    (station_coords[:, 0] - grid_lat) ** 2 + 
                    (station_coords[:, 1] - grid_lon) ** 2
                )
                interpolated.append(float(station_values[nearest_idx]))
        
        return interpolated
    
    def save_model(self, path: str):
        """Save trained model and metadata"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        # Save PyTorch model
        model_dir = os.path.dirname(path)
        if model_dir:
            os.makedirs(model_dir, exist_ok=True)
        
        torch.save(self.model.state_dict(), path)
        
        # Save metadata
        metadata = {
            'stations': self.stations,
            'station_ids': self.station_ids,
            'scaler': self.scaler,
            'adjacency_matrix': self.adjacency_matrix,
            'edge_index': self.edge_index,
            'edge_weights': self.edge_weights,
            'feature_names': self.feature_names,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers
        }
        
        metadata_path = path.replace('.pth', '_metadata.pkl')
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
    
    def load_model(self, path: str):
        """Load trained model and metadata"""
        try:
            # Load metadata first
            metadata_path = path.replace('.pth', '_metadata.pkl')
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
            
            # Restore attributes
            self.stations = metadata['stations']
            self.station_ids = metadata['station_ids']
            self.scaler = metadata['scaler']
            self.adjacency_matrix = metadata['adjacency_matrix']
            self.edge_index = metadata['edge_index']
            self.edge_weights = metadata['edge_weights']
            self.feature_names = metadata['feature_names']
            self.hidden_dim = metadata['hidden_dim']
            self.num_layers = metadata['num_layers']
            
            # Build and load model
            input_dim = len(self.feature_names)
            self.model = self._build_gnn_model(input_dim).to(self.device)
            self.model.load_state_dict(torch.load(path, map_location=self.device))
            
            self.is_trained = True
            
        except Exception as e:
            logging.error(f"Error loading GNN model: {e}")
            raise


# Factory function
def create_spatial_gnn(stations: List[Station], **kwargs) -> SpatialGNN:
    """Create SpatialGNN instance with given stations"""
    return SpatialGNN(stations, **kwargs)