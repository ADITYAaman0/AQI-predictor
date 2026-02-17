"""
Enhanced Source Attribution - ML-based pollution source attribution with SHAP explanations
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging
from dataclasses import dataclass

try:
    import shap
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    logging.warning("SHAP and sklearn not available. Using fallback attribution method.")

from ..utils.constants import SOURCE_CATEGORIES


@dataclass
class AttributionResult:
    """Result of source attribution analysis"""
    percentages: Dict[str, float]
    sources: List[Dict[str, Any]]
    confidence_score: float
    uncertainty: Dict[str, float]
    shap_values: Optional[Dict[str, float]] = None
    feature_importance: Optional[Dict[str, float]] = None
    model_version: str = "1.0"


@dataclass
class ScenarioResult:
    """Result of policy scenario analysis"""
    baseline_aqi: float
    predicted_aqi: float
    impact_percentage: float
    source_changes: Dict[str, float]
    confidence: float
    intervention_type: str


class MLSourceAttributor:
    """
    Advanced ML-based source attribution using Random Forest and SHAP explanations
    
    This class provides:
    1. ML-based source attribution using feature importance
    2. SHAP-based explanation generation
    3. Uncertainty quantification for attribution results
    4. Source-specific contribution calculators
    """
    
    def __init__(self):
        self.categories = SOURCE_CATEGORIES
        self.models = {}  # Store trained models for each source
        self.scalers = {}  # Store feature scalers
        self.feature_names = [
            'pm25', 'pm10', 'no2', 'so2', 'co', 'o3',
            'temperature', 'humidity', 'wind_speed', 'wind_direction',
            'hour', 'day_of_week', 'month', 'is_weekend',
            'pm25_pm10_ratio', 'rush_hour_factor', 'industrial_hour_factor',
            'burning_season_factor', 'wind_factor'
        ]
        self.is_trained = False
        self.shap_explainers = {}
        
    def _prepare_features(self, pollutants: Dict[str, float],
                         weather: Dict[str, float] = None,
                         hour: int = None,
                         month: int = None) -> np.ndarray:
        """Prepare feature vector for ML models"""
        hour = hour if hour is not None else datetime.now().hour
        month = month if month is not None else datetime.now().month
        weather = weather or {}
        
        # Get pollutant values with defaults
        pm25 = pollutants.get('pm25', 50)
        pm10 = pollutants.get('pm10', 75)
        no2 = pollutants.get('no2', 30)
        so2 = pollutants.get('so2', 10)
        co = pollutants.get('co', 0.5)
        o3 = pollutants.get('o3', 40)
        
        # Weather features
        temperature = weather.get('temperature', 25)
        humidity = weather.get('humidity', 50)
        wind_speed = weather.get('wind_speed', 3)
        wind_direction = weather.get('wind_direction', 180)
        
        # Temporal features
        day_of_week = datetime.now().weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Derived features
        pm25_pm10_ratio = pm25 / pm10 if pm10 > 0 else 0.5
        
        # Rush hour factor
        rush_hour_factor = 1.5 if (7 <= hour <= 10 or 17 <= hour <= 21) else 0.7
        if 22 <= hour or hour <= 5:
            rush_hour_factor = 0.3
            
        # Industrial hour factor
        industrial_hour_factor = 1.2 if (9 <= hour <= 18) else 0.8
        
        # Burning season factor
        burning_season_factor = 1.5 if month in [10, 11] else (1.2 if month in [9, 12] else 0.5)
        
        # Wind factor
        wind_factor = 0.3 if wind_speed < 2 else (0.6 if wind_speed > 5 else 0.4)
        
        features = np.array([
            pm25, pm10, no2, so2, co, o3,
            temperature, humidity, wind_speed, wind_direction,
            hour, day_of_week, month, is_weekend,
            pm25_pm10_ratio, rush_hour_factor, industrial_hour_factor,
            burning_season_factor, wind_factor
        ])
        
        return features.reshape(1, -1)
    
    def train_models(self, training_data: pd.DataFrame) -> Dict[str, float]:
        """
        Train ML models for source attribution
        
        Args:
            training_data: DataFrame with features and source attribution labels
            
        Returns:
            Dictionary of model performance metrics
        """
        if not SHAP_AVAILABLE:
            logging.warning("SHAP not available. Cannot train ML models.")
            return {}
            
        performance_metrics = {}
        
        # Prepare features
        feature_columns = [col for col in self.feature_names if col in training_data.columns]
        X = training_data[feature_columns]
        
        # Train a model for each source category
        for source in self.categories.keys():
            if f'{source}_percent' not in training_data.columns:
                continue
                
            y = training_data[f'{source}_percent']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train Random Forest model
            model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model.predict(X_test_scaled)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            r2 = r2_score(y_test, y_pred)
            
            # Store model and scaler
            self.models[source] = model
            self.scalers[source] = scaler
            
            # Create SHAP explainer
            self.shap_explainers[source] = shap.TreeExplainer(model)
            
            performance_metrics[source] = {
                'rmse': rmse,
                'r2': r2,
                'feature_importance': dict(zip(feature_columns, model.feature_importances_))
            }
            
        self.is_trained = len(self.models) > 0
        return performance_metrics
    
    def calculate_attribution(self, pollutants: Dict[str, float],
                              weather: Dict[str, float] = None,
                              hour: int = None,
                              month: int = None) -> AttributionResult:
        """
        Calculate ML-based source attribution with SHAP explanations
        
        Args:
            pollutants: Dict of pollutant concentrations
            weather: Weather conditions
            hour: Current hour (0-23)
            month: Current month (1-12)
            
        Returns:
            AttributionResult with percentages, confidence, and explanations
        """
        # Prepare features
        features = self._prepare_features(pollutants, weather, hour, month)
        
        if not self.is_trained or not SHAP_AVAILABLE:
            # Fallback to rule-based attribution
            return self._fallback_attribution(pollutants, weather, hour, month)
        
        # ML-based attribution
        percentages = {}
        shap_values = {}
        uncertainties = {}
        
        for source in self.categories.keys():
            if source not in self.models:
                continue
                
            # Scale features
            features_scaled = self.scalers[source].transform(features)
            
            # Predict source contribution
            prediction = self.models[source].predict(features_scaled)[0]
            percentages[source] = max(0, min(100, prediction))
            
            # Calculate SHAP values
            shap_vals = self.shap_explainers[source].shap_values(features_scaled)
            shap_values[source] = dict(zip(self.feature_names, shap_vals[0]))
            
            # Estimate uncertainty using model's prediction variance
            # For Random Forest, use prediction variance across trees
            tree_predictions = np.array([
                tree.predict(features_scaled)[0] 
                for tree in self.models[source].estimators_
            ])
            uncertainties[source] = np.std(tree_predictions)
        
        # Normalize percentages to sum to 100%
        total = sum(percentages.values())
        if total > 0:
            percentages = {k: (v / total * 100) for k, v in percentages.items()}
        else:
            # Equal distribution if no predictions
            percentages = {k: 25.0 for k in self.categories.keys()}
        
        # Calculate overall confidence score
        avg_uncertainty = np.mean(list(uncertainties.values())) if uncertainties else 10.0
        confidence_score = max(0.1, min(1.0, 1.0 - (avg_uncertainty / 50.0)))
        
        # Calculate feature importance
        feature_importance = self._calculate_feature_importance(shap_values)
        
        # Create detailed response
        sources = []
        for key, pct in sorted(percentages.items(), key=lambda x: x[1], reverse=True):
            cat = self.categories[key]
            sources.append({
                'key': key,
                'name': cat['name'],
                'percentage': round(pct, 1),
                'color': cat['color'],
                'icon': cat['icon'],
                'description': self._get_source_description(key, pct, hour, month),
                'uncertainty': round(uncertainties.get(key, 10.0), 2)
            })
        
        return AttributionResult(
            percentages=percentages,
            sources=sources,
            confidence_score=confidence_score,
            uncertainty=uncertainties,
            shap_values=shap_values,
            feature_importance=feature_importance
        )
    
    def _calculate_feature_importance(self, shap_values: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """Calculate overall feature importance from SHAP values"""
        if not shap_values:
            return {}
            
        feature_importance = {}
        for feature in self.feature_names:
            total_importance = 0
            count = 0
            
            for source_shap in shap_values.values():
                if feature in source_shap:
                    total_importance += abs(source_shap[feature])
                    count += 1
            
            if count > 0:
                feature_importance[feature] = total_importance / count
        
        return feature_importance
    
    def _fallback_attribution(self, pollutants: Dict[str, float],
                             weather: Dict[str, float] = None,
                             hour: int = None,
                             month: int = None) -> AttributionResult:
        """Fallback to rule-based attribution when ML models not available"""
        # Use the original SourceAttributor logic
        fallback_attributor = SourceAttributor()
        result = fallback_attributor.calculate_attribution(pollutants, weather, hour, month)
        
        # Convert to AttributionResult format
        return AttributionResult(
            percentages=result['percentages'],
            sources=result['sources'],
            confidence_score=0.6,  # Lower confidence for rule-based
            uncertainty={k: 15.0 for k in result['percentages'].keys()},
            shap_values=None,
            feature_importance=None,
            model_version="fallback"
        )
    
    def quantify_uncertainty(self, attribution_result: AttributionResult) -> Dict[str, Any]:
        """
        Quantify uncertainty in attribution results
        
        Args:
            attribution_result: Result from calculate_attribution
            
        Returns:
            Dictionary with uncertainty metrics
        """
        uncertainty_metrics = {
            'overall_confidence': attribution_result.confidence_score,
            'source_uncertainties': attribution_result.uncertainty,
            'prediction_intervals': {},
            'reliability_score': 0.0
        }
        
        # Calculate prediction intervals (95% confidence)
        for source, uncertainty in attribution_result.uncertainty.items():
            percentage = attribution_result.percentages[source]
            margin = 1.96 * uncertainty  # 95% CI
            
            uncertainty_metrics['prediction_intervals'][source] = {
                'lower': max(0, percentage - margin),
                'upper': min(100, percentage + margin),
                'margin': margin
            }
        
        # Calculate reliability score based on model performance and data quality
        if self.is_trained:
            # Higher reliability for trained models
            uncertainty_metrics['reliability_score'] = min(0.9, attribution_result.confidence_score + 0.2)
        else:
            # Lower reliability for rule-based fallback
            uncertainty_metrics['reliability_score'] = attribution_result.confidence_score
        
        return uncertainty_metrics
    
    def analyze_scenario(self, baseline_pollutants: Dict[str, float],
                        intervention: Dict[str, Any],
                        weather: Dict[str, float] = None,
                        hour: int = None,
                        month: int = None) -> ScenarioResult:
        """
        Analyze "what-if" policy scenarios
        
        Args:
            baseline_pollutants: Current pollutant levels
            intervention: Policy intervention parameters
            weather: Weather conditions
            hour: Current hour
            month: Current month
            
        Returns:
            ScenarioResult with predicted impacts
        """
        # Calculate baseline attribution
        baseline_attribution = self.calculate_attribution(
            baseline_pollutants, weather, hour, month
        )
        baseline_aqi = self._calculate_aqi(baseline_pollutants)
        
        # Apply intervention effects
        modified_pollutants = self._apply_intervention(
            baseline_pollutants, intervention
        )
        
        # Calculate modified attribution
        modified_attribution = self.calculate_attribution(
            modified_pollutants, weather, hour, month
        )
        predicted_aqi = self._calculate_aqi(modified_pollutants)
        
        # Calculate impact
        impact_percentage = ((baseline_aqi - predicted_aqi) / baseline_aqi * 100) if baseline_aqi > 0 else 0
        
        # Calculate source changes
        source_changes = {}
        for source in self.categories.keys():
            baseline_pct = baseline_attribution.percentages.get(source, 0)
            modified_pct = modified_attribution.percentages.get(source, 0)
            source_changes[source] = modified_pct - baseline_pct
        
        # Estimate confidence based on intervention type and magnitude
        confidence = self._estimate_scenario_confidence(intervention, impact_percentage)
        
        return ScenarioResult(
            baseline_aqi=baseline_aqi,
            predicted_aqi=predicted_aqi,
            impact_percentage=impact_percentage,
            source_changes=source_changes,
            confidence=confidence,
            intervention_type=intervention.get('type', 'unknown')
        )
    
    def _apply_intervention(self, pollutants: Dict[str, float],
                          intervention: Dict[str, Any]) -> Dict[str, float]:
        """Apply policy intervention effects to pollutant levels"""
        modified = pollutants.copy()
        intervention_type = intervention.get('type', '')
        magnitude = intervention.get('magnitude', 0.1)  # 10% reduction by default
        
        if intervention_type == 'traffic_reduction':
            # Reduce traffic-related pollutants
            modified['no2'] = pollutants.get('no2', 30) * (1 - magnitude)
            modified['co'] = pollutants.get('co', 0.5) * (1 - magnitude)
            # Secondary effects on PM2.5
            modified['pm25'] = pollutants.get('pm25', 50) * (1 - magnitude * 0.3)
            
        elif intervention_type == 'industrial_control':
            # Reduce industrial pollutants
            modified['so2'] = pollutants.get('so2', 10) * (1 - magnitude)
            modified['pm10'] = pollutants.get('pm10', 75) * (1 - magnitude * 0.4)
            modified['pm25'] = pollutants.get('pm25', 50) * (1 - magnitude * 0.2)
            
        elif intervention_type == 'biomass_control':
            # Reduce biomass burning pollutants
            modified['pm25'] = pollutants.get('pm25', 50) * (1 - magnitude)
            modified['pm10'] = pollutants.get('pm10', 75) * (1 - magnitude * 0.6)
            
        elif intervention_type == 'comprehensive':
            # Reduce all sources proportionally
            for pollutant in modified.keys():
                modified[pollutant] = pollutants[pollutant] * (1 - magnitude * 0.5)
        
        return modified
    
    def _calculate_aqi(self, pollutants: Dict[str, float]) -> float:
        """Calculate AQI from pollutant concentrations (simplified)"""
        pm25 = pollutants.get('pm25', 50)
        # Simplified AQI calculation based on PM2.5
        if pm25 <= 12:
            return pm25 * 50 / 12
        elif pm25 <= 35.4:
            return 50 + (pm25 - 12) * 50 / (35.4 - 12)
        elif pm25 <= 55.4:
            return 100 + (pm25 - 35.4) * 50 / (55.4 - 35.4)
        elif pm25 <= 150.4:
            return 150 + (pm25 - 55.4) * 50 / (150.4 - 55.4)
        elif pm25 <= 250.4:
            return 200 + (pm25 - 150.4) * 100 / (250.4 - 150.4)
        else:
            return 300 + (pm25 - 250.4) * 200 / (500.4 - 250.4)
    
    def _estimate_scenario_confidence(self, intervention: Dict[str, Any],
                                    impact_percentage: float) -> float:
        """Estimate confidence in scenario analysis results"""
        base_confidence = 0.7
        
        # Adjust based on intervention type
        intervention_type = intervention.get('type', '')
        if intervention_type in ['traffic_reduction', 'industrial_control']:
            base_confidence += 0.1  # More confident in direct interventions
        elif intervention_type == 'comprehensive':
            base_confidence -= 0.1  # Less confident in complex interventions
        
        # Adjust based on impact magnitude
        magnitude = abs(impact_percentage)
        if magnitude > 50:
            base_confidence -= 0.2  # Less confident in large impacts
        elif magnitude < 5:
            base_confidence -= 0.1  # Less confident in small impacts
        
        return max(0.1, min(0.9, base_confidence))
    
    def _get_source_description(self, source: str, percentage: float,
                               hour: int, month: int) -> str:
        """Generate human-readable description for source contribution"""
        descriptions = {
            'traffic': {
                'high': "Heavy vehicular emissions due to rush hour congestion",
                'medium': "Moderate traffic contributing to pollution",
                'low': "Light traffic activity"
            },
            'industry': {
                'high': "Significant industrial emissions in the region",
                'medium': "Industrial activity contributing to pollution",
                'low': "Low industrial impact"
            },
            'biomass': {
                'high': "High biomass burning activity (stubble/waste)",
                'medium': "Moderate biomass burning detected",
                'low': "Minimal biomass burning"
            },
            'background': {
                'high': "Significant regional transport and dust",
                'medium': "Moderate background pollution and haze",
                'low': "Good atmospheric dispersion"
            }
        }
        
        level = 'high' if percentage > 35 else ('medium' if percentage > 20 else 'low')
        
        base = descriptions.get(source, {}).get(level, "Contributing to pollution")
        
        # Add context
        if source == 'biomass' and month in [10, 11]:
            base += " (stubble burning season)"
        elif source == 'traffic' and (7 <= hour <= 10 or 17 <= hour <= 21):
            base += " (peak hours)"
        
        return base
class SourceAttributor:
    """
    Rule-based source attribution (fallback implementation)
    
    Uses a proxy-based approach for MVP:
    - Traffic: Correlated with NO2, CO, rush hours
    - Industry: Correlated with SO2, nighttime emissions
    - Biomass: Correlated with PM2.5/PM10 ratio, fire season
    - Background: Residual from meteorological factors
    """
    
    def __init__(self):
        self.categories = SOURCE_CATEGORIES
    
    def calculate_attribution(self, pollutants: Dict[str, float],
                              weather: Dict[str, float] = None,
                              hour: int = None,
                              month: int = None) -> Dict[str, Any]:
        """
        Calculate source attribution for current pollution levels
        
        Args:
            pollutants: Dict of pollutant concentrations
            weather: Weather conditions
            hour: Current hour (0-23)
            month: Current month (1-12)
            
        Returns:
            Attribution dictionary with percentages per source
        """
        hour = hour if hour is not None else datetime.now().hour
        month = month if month is not None else datetime.now().month
        weather = weather or {}
        
        # Initialize scores
        scores = {
            'traffic': 0,
            'industry': 0,
            'biomass': 0,
            'background': 0
        }
        
        # Get pollutant values with defaults
        pm25 = pollutants.get('pm25', 50)
        pm10 = pollutants.get('pm10', 75)
        no2 = pollutants.get('no2', 30)
        so2 = pollutants.get('so2', 10)
        co = pollutants.get('co', 0.5)
        
        # Traffic attribution
        # - Higher during rush hours
        # - Correlated with NO2 and CO
        rush_hour_factor = 1.5 if (7 <= hour <= 10 or 17 <= hour <= 21) else 0.7
        if 22 <= hour or hour <= 5:
            rush_hour_factor = 0.3  # Low traffic at night
        
        traffic_score = (
            (no2 / 50) * 0.4 +  # NO2 is key traffic indicator
            (co / 1.0) * 0.3 +  # CO also from vehicles
            rush_hour_factor * 0.3
        )
        scores['traffic'] = max(0.1, min(0.6, traffic_score))
        
        # Industry attribution
        # - Higher during working hours
        # - Correlated with SO2
        # - Some activity 24/7
        industry_hour_factor = 1.2 if (9 <= hour <= 18) else 0.8
        
        industry_score = (
            (so2 / 30) * 0.5 +  # SO2 is key industrial indicator
            industry_hour_factor * 0.3 +
            0.2  # Base industrial activity
        )
        scores['industry'] = max(0.05, min(0.4, industry_score))
        
        # Biomass attribution
        # - Higher during stubble burning season (Oct-Nov)
        # - Higher PM2.5/PM10 ratio indicates biomass
        # - Higher in early morning/evening (burning times)
        pm_ratio = pm25 / pm10 if pm10 > 0 else 0.5
        
        # Stubble burning season factor
        season_factor = 1.5 if month in [10, 11] else (1.2 if month in [9, 12] else 0.5)
        
        # Burning typically happens early morning or evening
        burning_hour_factor = 1.3 if (5 <= hour <= 8 or 17 <= hour <= 20) else 0.7
        
        biomass_score = (
            pm_ratio * 0.4 +
            season_factor * 0.3 +
            burning_hour_factor * 0.2 +
            (pm25 / 200) * 0.1  # Higher PM2.5 = more biomass
        )
        scores['biomass'] = max(0.05, min(0.5, biomass_score))
        
        # Background/Regional attribution
        # - Meteorological factors
        # - Regional transport
        # - Dust
        wind_speed = weather.get('wind_speed', 3)
        humidity = weather.get('humidity', 50)
        
        # Low wind = more local accumulation, less regional
        wind_factor = 0.3 if wind_speed < 2 else (0.6 if wind_speed > 5 else 0.4)
        
        # High humidity can indicate haze/regional pollution
        humidity_factor = 0.6 if humidity > 70 else 0.4
        
        background_score = (
            wind_factor * 0.4 +
            humidity_factor * 0.3 +
            (pm10 - pm25) / 100 * 0.3  # Coarse particles = dust
        )
        scores['background'] = max(0.1, min(0.4, background_score))
        
        # Normalize to sum to 100%
        total = sum(scores.values())
        percentages = {k: round(v / total * 100, 1) for k, v in scores.items()}
        
        # Create detailed response
        attribution = {
            'percentages': percentages,
            'sources': []
        }
        
        for key, pct in sorted(percentages.items(), key=lambda x: x[1], reverse=True):
            cat = self.categories[key]
            attribution['sources'].append({
                'key': key,
                'name': cat['name'],
                'percentage': pct,
                'color': cat['color'],
                'icon': cat['icon'],
                'description': self._get_source_description(key, pct, hour, month)
            })
        
        return attribution
    
    def _get_source_description(self, source: str, percentage: float,
                                 hour: int, month: int) -> str:
        """Generate human-readable description for source contribution"""
        descriptions = {
            'traffic': {
                'high': "Heavy vehicular emissions due to rush hour congestion",
                'medium': "Moderate traffic contributing to pollution",
                'low': "Light traffic activity"
            },
            'industry': {
                'high': "Significant industrial emissions in the region",
                'medium': "Industrial activity contributing to pollution",
                'low': "Low industrial impact"
            },
            'biomass': {
                'high': "High biomass burning activity (stubble/waste)",
                'medium': "Moderate biomass burning detected",
                'low': "Minimal biomass burning"
            },
            'background': {
                'high': "Significant regional transport and dust",
                'medium': "Moderate background pollution and haze",
                'low': "Good atmospheric dispersion"
            }
        }
        
        level = 'high' if percentage > 35 else ('medium' if percentage > 20 else 'low')
        
        base = descriptions.get(source, {}).get(level, "Contributing to pollution")
        
        # Add context
        if source == 'biomass' and month in [10, 11]:
            base += " (stubble burning season)"
        elif source == 'traffic' and (7 <= hour <= 10 or 17 <= hour <= 21):
            base += " (peak hours)"
        
        return base
    
    def get_mitigation_recommendations(self, attribution: Dict) -> List[str]:
        """
        Get recommendations based on dominant sources
        
        Args:
            attribution: Attribution result from calculate_attribution
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        percentages = attribution.get('percentages', {})
        
        # Sort by contribution
        sorted_sources = sorted(percentages.items(), key=lambda x: x[1], reverse=True)
        top_source = sorted_sources[0][0] if sorted_sources else 'background'
        
        if top_source == 'traffic':
            recommendations.extend([
                "🚗 Consider using public transport or carpooling",
                "🚶 Avoid walking near busy roads during rush hours",
                "🔧 Odd-even or vehicle restriction policies could help"
            ])
        elif top_source == 'industry':
            recommendations.extend([
                "🏭 Industrial emission monitoring may be needed",
                "🏠 Use air purifiers indoors",
                "📍 Check for industrial sources near your location"
            ])
        elif top_source == 'biomass':
            recommendations.extend([
                "🔥 Report any illegal burning to authorities",
                "😷 N95 masks are highly recommended outdoors",
                "🏠 Keep windows closed to prevent smoke entry"
            ])
        else:  # background
            recommendations.extend([
                "🌬️ Wait for weather conditions to improve",
                "🏠 Stay indoors during peak pollution hours",
                "💨 Consider areas with better ventilation"
            ])
        
        # General recommendations
        recommendations.append("🌿 Indoor plants can help filter some pollutants")
        
        return recommendations


# Singleton instances
_ml_attributor_instance = None
_attributor_instance = None

def get_ml_source_attributor() -> MLSourceAttributor:
    """Get or create MLSourceAttributor instance"""
    global _ml_attributor_instance
    if _ml_attributor_instance is None:
        _ml_attributor_instance = MLSourceAttributor()
    return _ml_attributor_instance

def get_source_attributor() -> SourceAttributor:
    """Get or create SourceAttributor instance"""
    global _attributor_instance
    if _attributor_instance is None:
        _attributor_instance = SourceAttributor()
    return _attributor_instance

def get_source_attribution_model():
    """Get the appropriate source attribution model"""
    if SHAP_AVAILABLE:
        return get_ml_source_attributor()
    else:
        return get_source_attributor()