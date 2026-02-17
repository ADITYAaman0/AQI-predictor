"""
Policy Simulation and "What-If" Analysis Engine
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging

from .source_attribution import get_ml_source_attributor, AttributionResult, ScenarioResult
from ..utils.constants import SOURCE_CATEGORIES


class InterventionType(Enum):
    """Types of policy interventions"""
    TRAFFIC_REDUCTION = "traffic_reduction"
    INDUSTRIAL_CONTROL = "industrial_control"
    BIOMASS_CONTROL = "biomass_control"
    COMPREHENSIVE = "comprehensive"
    WEATHER_MODIFICATION = "weather_modification"


@dataclass
class PolicyIntervention:
    """Definition of a policy intervention"""
    intervention_type: InterventionType
    magnitude: float  # 0.0 to 1.0 (percentage reduction)
    duration_hours: int
    target_sources: List[str]
    implementation_cost: Optional[float] = None
    feasibility_score: Optional[float] = None
    description: str = ""


@dataclass
class SimulationResult:
    """Result of policy simulation"""
    baseline_aqi: float
    predicted_aqi: float
    aqi_reduction: float
    percentage_improvement: float
    source_changes: Dict[str, float]
    confidence: float
    intervention: PolicyIntervention
    cost_effectiveness: Optional[float] = None
    health_benefits: Optional[Dict[str, float]] = None
    timeline: List[Dict[str, Any]] = None


class PolicySimulator:
    """
    Policy simulation and "what-if" analysis engine
    
    This class provides:
    1. Scenario analysis engine for policy interventions
    2. Traffic reduction impact calculator
    3. Industrial emission control simulation
    4. Policy recommendation system
    """
    
    def __init__(self):
        self.attributor = get_ml_source_attributor()
        self.intervention_effects = self._initialize_intervention_effects()
        self.cost_models = self._initialize_cost_models()
        
    def _initialize_intervention_effects(self) -> Dict[str, Dict[str, float]]:
        """Initialize intervention effect coefficients"""
        return {
            InterventionType.TRAFFIC_REDUCTION.value: {
                'no2': 0.8,      # Direct effect on NO2
                'co': 0.7,       # Direct effect on CO
                'pm25': 0.3,     # Secondary effect on PM2.5
                'pm10': 0.2,     # Secondary effect on PM10
                'o3': -0.1,      # Potential increase in O3 (less NO titration)
                'so2': 0.0       # No effect on SO2
            },
            InterventionType.INDUSTRIAL_CONTROL.value: {
                'so2': 0.9,      # Direct effect on SO2
                'pm10': 0.6,     # Direct effect on PM10
                'pm25': 0.4,     # Secondary effect on PM2.5
                'no2': 0.2,      # Some industrial NO2
                'co': 0.1,       # Minor industrial CO
                'o3': 0.0        # No direct effect on O3
            },
            InterventionType.BIOMASS_CONTROL.value: {
                'pm25': 0.9,     # Direct effect on PM2.5
                'pm10': 0.7,     # Direct effect on PM10
                'co': 0.5,       # Biomass burning CO
                'no2': 0.1,      # Minor NO2 from burning
                'so2': 0.1,      # Minor SO2 from burning
                'o3': 0.0        # No direct effect on O3
            },
            InterventionType.COMPREHENSIVE.value: {
                'pm25': 0.6,     # Combined effect
                'pm10': 0.5,     # Combined effect
                'no2': 0.5,      # Combined effect
                'so2': 0.4,      # Combined effect
                'co': 0.4,       # Combined effect
                'o3': 0.1        # Minor combined effect
            }
        }
    
    def _initialize_cost_models(self) -> Dict[str, Dict[str, float]]:
        """Initialize cost models for different interventions"""
        return {
            InterventionType.TRAFFIC_REDUCTION.value: {
                'base_cost_per_day': 1000000,  # ₹10 lakh per day
                'magnitude_multiplier': 2.0,   # Cost increases with magnitude
                'duration_discount': 0.9       # Slight discount for longer duration
            },
            InterventionType.INDUSTRIAL_CONTROL.value: {
                'base_cost_per_day': 2000000,  # ₹20 lakh per day
                'magnitude_multiplier': 1.5,
                'duration_discount': 0.95
            },
            InterventionType.BIOMASS_CONTROL.value: {
                'base_cost_per_day': 500000,   # ₹5 lakh per day
                'magnitude_multiplier': 1.2,
                'duration_discount': 0.8
            },
            InterventionType.COMPREHENSIVE.value: {
                'base_cost_per_day': 5000000,  # ₹50 lakh per day
                'magnitude_multiplier': 1.8,
                'duration_discount': 0.85
            }
        }
    
    def simulate_intervention(self, 
                            baseline_pollutants: Dict[str, float],
                            intervention: PolicyIntervention,
                            weather: Dict[str, float] = None,
                            hour: int = None,
                            month: int = None) -> SimulationResult:
        """
        Simulate the impact of a policy intervention
        
        Args:
            baseline_pollutants: Current pollutant levels
            intervention: Policy intervention to simulate
            weather: Weather conditions
            hour: Current hour
            month: Current month
            
        Returns:
            SimulationResult with predicted impacts
        """
        # Calculate baseline AQI and attribution
        baseline_attribution = self.attributor.calculate_attribution(
            baseline_pollutants, weather, hour, month
        )
        baseline_aqi = self._calculate_aqi(baseline_pollutants)
        
        # Apply intervention effects
        modified_pollutants = self._apply_intervention_effects(
            baseline_pollutants, intervention
        )
        
        # Calculate modified AQI and attribution
        modified_attribution = self.attributor.calculate_attribution(
            modified_pollutants, weather, hour, month
        )
        predicted_aqi = self._calculate_aqi(modified_pollutants)
        
        # Calculate improvements
        aqi_reduction = baseline_aqi - predicted_aqi
        percentage_improvement = (aqi_reduction / baseline_aqi * 100) if baseline_aqi > 0 else 0
        
        # Calculate source changes
        source_changes = {}
        if hasattr(baseline_attribution, 'percentages'):
            baseline_pct = baseline_attribution.percentages
            modified_pct = modified_attribution.percentages
        else:
            baseline_pct = baseline_attribution['percentages']
            modified_pct = modified_attribution['percentages']
            
        for source in SOURCE_CATEGORIES.keys():
            baseline_val = baseline_pct.get(source, 0)
            modified_val = modified_pct.get(source, 0)
            source_changes[source] = modified_val - baseline_val
        
        # Estimate confidence
        confidence = self._estimate_intervention_confidence(
            intervention, percentage_improvement, baseline_pollutants
        )
        
        # Calculate cost effectiveness
        cost_effectiveness = self._calculate_cost_effectiveness(
            intervention, aqi_reduction
        )
        
        # Estimate health benefits
        health_benefits = self._estimate_health_benefits(
            aqi_reduction, intervention.duration_hours
        )
        
        # Generate timeline
        timeline = self._generate_intervention_timeline(
            intervention, baseline_aqi, predicted_aqi
        )
        
        return SimulationResult(
            baseline_aqi=baseline_aqi,
            predicted_aqi=predicted_aqi,
            aqi_reduction=aqi_reduction,
            percentage_improvement=percentage_improvement,
            source_changes=source_changes,
            confidence=confidence,
            intervention=intervention,
            cost_effectiveness=cost_effectiveness,
            health_benefits=health_benefits,
            timeline=timeline
        )
    
    def _apply_intervention_effects(self, 
                                  pollutants: Dict[str, float],
                                  intervention: PolicyIntervention) -> Dict[str, float]:
        """Apply intervention effects to pollutant levels"""
        modified = pollutants.copy()
        intervention_type = intervention.intervention_type.value
        magnitude = intervention.magnitude
        
        if intervention_type not in self.intervention_effects:
            logging.warning(f"Unknown intervention type: {intervention_type}")
            return modified
        
        effects = self.intervention_effects[intervention_type]
        
        # If PM2.5 is not present but PM10 is, estimate PM2.5 for intervention effects
        if 'pm25' not in modified and 'pm10' in modified:
            modified['pm25'] = modified['pm10'] * 0.6
        
        for pollutant, effect_coefficient in effects.items():
            if pollutant in modified:
                current_value = modified[pollutant]
                
                # Apply effect with magnitude scaling
                effect = effect_coefficient * magnitude
                
                # Handle negative effects (e.g., O3 increase from NO reduction)
                if effect < 0:
                    modified[pollutant] = current_value * (1 + abs(effect))
                else:
                    # Apply reduction proportional to current value and effect
                    reduction = current_value * effect
                    modified[pollutant] = max(0, current_value - reduction)
                
                # Ensure non-negative values
                modified[pollutant] = max(0, modified[pollutant])
        
        return modified
    
    def _calculate_aqi(self, pollutants: Dict[str, float]) -> float:
        """Calculate AQI from pollutant concentrations (simplified)"""
        # Try PM2.5 first
        if 'pm25' in pollutants:
            pm25 = pollutants['pm25']
        elif 'pm10' in pollutants:
            # Estimate PM2.5 from PM10 (typically PM2.5 is about 60% of PM10)
            pm25 = pollutants['pm10'] * 0.6
        else:
            # Estimate PM2.5 from other pollutants if no PM data available
            pm25 = 0
            if 'no2' in pollutants:
                # NO2 contributes to secondary PM formation
                pm25 += pollutants['no2'] * 0.3
            if 'so2' in pollutants:
                # SO2 contributes to secondary PM formation
                pm25 += pollutants['so2'] * 0.4
            if 'co' in pollutants:
                # CO has minimal direct contribution to PM
                pm25 += pollutants['co'] * 0.1
            
            # Ensure minimum reasonable value
            pm25 = max(pm25, 10)
        
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
    
    def _estimate_intervention_confidence(self, 
                                        intervention: PolicyIntervention,
                                        improvement: float,
                                        baseline_pollutants: Dict[str, float]) -> float:
        """Estimate confidence in intervention results"""
        base_confidence = 0.7
        
        # Adjust based on intervention type
        if intervention.intervention_type == InterventionType.TRAFFIC_REDUCTION:
            base_confidence += 0.1  # Well-understood intervention
        elif intervention.intervention_type == InterventionType.COMPREHENSIVE:
            base_confidence -= 0.1  # More complex, less predictable
        
        # Adjust based on magnitude
        if intervention.magnitude > 0.7:
            base_confidence -= 0.1  # High magnitude interventions are harder
        elif intervention.magnitude < 0.2:
            base_confidence -= 0.05  # Very small interventions have high uncertainty
        
        # Adjust based on improvement size
        if improvement > 50:
            base_confidence -= 0.2  # Very large improvements are suspicious
        elif improvement < 5:
            base_confidence -= 0.1  # Very small improvements have high noise
        
        # Adjust based on baseline pollution level
        baseline_aqi = self._calculate_aqi(baseline_pollutants)
        if baseline_aqi > 200:
            base_confidence += 0.05  # Easier to improve from very high levels
        elif baseline_aqi < 50:
            base_confidence -= 0.1  # Harder to improve from good levels
        
        return max(0.1, min(0.9, base_confidence))
    
    def _calculate_cost_effectiveness(self, 
                                    intervention: PolicyIntervention,
                                    aqi_reduction: float) -> float:
        """Calculate cost effectiveness (AQI reduction per rupee)"""
        intervention_type = intervention.intervention_type.value
        
        if intervention_type not in self.cost_models:
            return 0.0
        
        cost_model = self.cost_models[intervention_type]
        
        # Calculate total cost
        base_cost = cost_model['base_cost_per_day']
        magnitude_factor = cost_model['magnitude_multiplier'] ** intervention.magnitude
        duration_factor = (intervention.duration_hours / 24) * (cost_model['duration_discount'] ** (intervention.duration_hours / 24))
        
        total_cost = base_cost * magnitude_factor * duration_factor
        
        # Cost effectiveness = AQI reduction per million rupees
        if total_cost > 0:
            return (aqi_reduction / (total_cost / 1000000))
        else:
            return 0.0
    
    def _estimate_health_benefits(self, 
                                aqi_reduction: float,
                                duration_hours: int) -> Dict[str, float]:
        """Estimate health benefits from AQI reduction"""
        # Simplified health benefit calculation
        # Based on WHO estimates of health impacts from air pollution
        
        # Population affected (assuming Delhi NCR)
        population = 30000000  # 3 crore people
        
        # Health benefit coefficients (per AQI point reduction per day)
        benefits = {
            'premature_deaths_avoided': aqi_reduction * 0.001 * (duration_hours / 24),
            'respiratory_cases_avoided': aqi_reduction * 0.1 * (duration_hours / 24),
            'cardiovascular_cases_avoided': aqi_reduction * 0.05 * (duration_hours / 24),
            'economic_benefit_inr': aqi_reduction * 1000000 * (duration_hours / 24)  # ₹10 lakh per AQI point per day
        }
        
        # Scale by population
        for key in benefits:
            if key != 'economic_benefit_inr':
                benefits[key] *= (population / 1000000)  # Per million people
        
        return benefits
    
    def _generate_intervention_timeline(self, 
                                      intervention: PolicyIntervention,
                                      baseline_aqi: float,
                                      predicted_aqi: float) -> List[Dict[str, Any]]:
        """Generate timeline showing intervention effects over time"""
        timeline = []
        
        # Implementation phase (first 25% of duration)
        implementation_hours = max(1, intervention.duration_hours // 4)
        
        for hour in range(intervention.duration_hours + 1):
            if hour <= implementation_hours:
                # Gradual implementation
                progress = hour / implementation_hours
                current_aqi = baseline_aqi - (baseline_aqi - predicted_aqi) * progress * 0.5
            elif hour <= intervention.duration_hours:
                # Full effect
                current_aqi = predicted_aqi
            else:
                # Recovery phase (after intervention ends)
                recovery_progress = min(1.0, (hour - intervention.duration_hours) / 24)
                current_aqi = predicted_aqi + (baseline_aqi - predicted_aqi) * recovery_progress * 0.7
            
            timeline.append({
                'hour': hour,
                'aqi': round(current_aqi, 1),
                'phase': 'implementation' if hour <= implementation_hours else 
                        ('active' if hour <= intervention.duration_hours else 'recovery')
            })
        
        return timeline
    
    def recommend_interventions(self, 
                              baseline_pollutants: Dict[str, float],
                              target_aqi_reduction: float,
                              max_cost: Optional[float] = None,
                              weather: Dict[str, float] = None,
                              hour: int = None,
                              month: int = None) -> List[SimulationResult]:
        """
        Recommend optimal policy interventions to achieve target AQI reduction
        
        Args:
            baseline_pollutants: Current pollutant levels
            target_aqi_reduction: Desired AQI reduction
            max_cost: Maximum acceptable cost (optional)
            weather: Weather conditions
            hour: Current hour
            month: Current month
            
        Returns:
            List of recommended interventions sorted by effectiveness
        """
        recommendations = []
        
        # Define candidate interventions
        candidate_interventions = [
            PolicyIntervention(
                InterventionType.TRAFFIC_REDUCTION, 0.3, 24, ['traffic'],
                description="30% traffic reduction for 24 hours"
            ),
            PolicyIntervention(
                InterventionType.TRAFFIC_REDUCTION, 0.5, 48, ['traffic'],
                description="50% traffic reduction for 48 hours"
            ),
            PolicyIntervention(
                InterventionType.INDUSTRIAL_CONTROL, 0.4, 72, ['industry'],
                description="40% industrial emission control for 72 hours"
            ),
            PolicyIntervention(
                InterventionType.BIOMASS_CONTROL, 0.8, 24, ['biomass'],
                description="80% biomass burning control for 24 hours"
            ),
            PolicyIntervention(
                InterventionType.COMPREHENSIVE, 0.3, 48, ['traffic', 'industry', 'biomass'],
                description="30% comprehensive emission reduction for 48 hours"
            )
        ]
        
        # Simulate each intervention
        for intervention in candidate_interventions:
            try:
                result = self.simulate_intervention(
                    baseline_pollutants, intervention, weather, hour, month
                )
                
                # Filter by cost if specified
                if max_cost is not None:
                    intervention_cost = self._calculate_total_cost(intervention)
                    if intervention_cost > max_cost:
                        continue
                
                recommendations.append(result)
                
            except Exception as e:
                logging.warning(f"Failed to simulate intervention {intervention.description}: {e}")
                continue
        
        # Sort by effectiveness (AQI reduction) and cost effectiveness
        recommendations.sort(
            key=lambda x: (x.aqi_reduction, x.cost_effectiveness or 0),
            reverse=True
        )
        
        return recommendations
    
    def _calculate_total_cost(self, intervention: PolicyIntervention) -> float:
        """Calculate total cost of intervention"""
        intervention_type = intervention.intervention_type.value
        
        if intervention_type not in self.cost_models:
            return 0.0
        
        cost_model = self.cost_models[intervention_type]
        
        base_cost = cost_model['base_cost_per_day']
        magnitude_factor = cost_model['magnitude_multiplier'] ** intervention.magnitude
        duration_factor = (intervention.duration_hours / 24) * (cost_model['duration_discount'] ** (intervention.duration_hours / 24))
        
        return base_cost * magnitude_factor * duration_factor
    
    def analyze_combined_interventions(self, 
                                     baseline_pollutants: Dict[str, float],
                                     interventions: List[PolicyIntervention],
                                     weather: Dict[str, float] = None,
                                     hour: int = None,
                                     month: int = None) -> SimulationResult:
        """
        Analyze the combined effect of multiple simultaneous interventions
        
        Args:
            baseline_pollutants: Current pollutant levels
            interventions: List of interventions to apply simultaneously
            weather: Weather conditions
            hour: Current hour
            month: Current month
            
        Returns:
            SimulationResult for combined interventions
        """
        # Apply all interventions sequentially
        modified_pollutants = baseline_pollutants.copy()
        
        for intervention in interventions:
            modified_pollutants = self._apply_intervention_effects(
                modified_pollutants, intervention
            )
        
        # Create combined intervention description
        combined_intervention = PolicyIntervention(
            InterventionType.COMPREHENSIVE,
            magnitude=np.mean([i.magnitude for i in interventions]),
            duration_hours=max([i.duration_hours for i in interventions]),
            target_sources=list(set().union(*[i.target_sources for i in interventions])),
            description=f"Combined intervention: {', '.join([i.description for i in interventions])}"
        )
        
        # Calculate baseline and modified AQI
        baseline_aqi = self._calculate_aqi(baseline_pollutants)
        predicted_aqi = self._calculate_aqi(modified_pollutants)
        
        # Calculate improvements
        aqi_reduction = baseline_aqi - predicted_aqi
        percentage_improvement = (aqi_reduction / baseline_aqi * 100) if baseline_aqi > 0 else 0
        
        # Calculate source changes
        baseline_attribution = self.attributor.calculate_attribution(
            baseline_pollutants, weather, hour, month
        )
        modified_attribution = self.attributor.calculate_attribution(
            modified_pollutants, weather, hour, month
        )
        
        source_changes = {}
        if hasattr(baseline_attribution, 'percentages'):
            baseline_pct = baseline_attribution.percentages
            modified_pct = modified_attribution.percentages
        else:
            baseline_pct = baseline_attribution['percentages']
            modified_pct = modified_attribution['percentages']
            
        for source in SOURCE_CATEGORIES.keys():
            baseline_val = baseline_pct.get(source, 0)
            modified_val = modified_pct.get(source, 0)
            source_changes[source] = modified_val - baseline_val
        
        # Estimate confidence (lower for combined interventions)
        confidence = self._estimate_intervention_confidence(
            combined_intervention, percentage_improvement, baseline_pollutants
        ) * 0.9  # Reduce confidence for combined interventions
        
        return SimulationResult(
            baseline_aqi=baseline_aqi,
            predicted_aqi=predicted_aqi,
            aqi_reduction=aqi_reduction,
            percentage_improvement=percentage_improvement,
            source_changes=source_changes,
            confidence=confidence,
            intervention=combined_intervention
        )


# Singleton
_policy_simulator_instance = None

def get_policy_simulator() -> PolicySimulator:
    """Get or create PolicySimulator instance"""
    global _policy_simulator_instance
    if _policy_simulator_instance is None:
        _policy_simulator_instance = PolicySimulator()
    return _policy_simulator_instance
    def simulate_interventions(self, 
                             location: Tuple[float, float],
                             baseline_pm25: float,
                             interventions: List[Dict[str, Any]],
                             weather: Dict[str, float] = None,
                             hour: int = None,
                             month: int = None) -> Dict[str, Any]:
        """
        Simulate multiple policy interventions (wrapper for API compatibility)
        
        Args:
            location: (latitude, longitude) tuple
            baseline_pm25: Current PM2.5 level
            interventions: List of intervention dictionaries
            weather: Weather conditions
            hour: Current hour
            month: Current month
            
        Returns:
            Dictionary with simulation results
        """
        # Convert baseline PM2.5 to full pollutant dict
        baseline_pollutants = {
            'pm25': baseline_pm25,
            'pm10': baseline_pm25 * 1.5,  # Estimate PM10 from PM2.5
            'no2': 30,  # Default values
            'so2': 10,
            'co': 0.5,
            'o3': 40
        }
        
        # Convert intervention dicts to PolicyIntervention objects
        policy_interventions = []
        for intervention_dict in interventions:
            intervention_type = intervention_dict.get('type', 'comprehensive')
            magnitude = intervention_dict.get('magnitude', 0.1)
            duration = intervention_dict.get('duration_hours', 24)
            
            # Map string types to enum
            type_mapping = {
                'traffic_reduction': InterventionType.TRAFFIC_REDUCTION,
                'industrial_control': InterventionType.INDUSTRIAL_CONTROL,
                'biomass_control': InterventionType.BIOMASS_CONTROL,
                'comprehensive': InterventionType.COMPREHENSIVE,
                'weather_modification': InterventionType.WEATHER_MODIFICATION
            }
            
            policy_intervention = PolicyIntervention(
                intervention_type=type_mapping.get(intervention_type, InterventionType.COMPREHENSIVE),
                magnitude=magnitude,
                duration_hours=duration,
                target_sources=intervention_dict.get('target_sources', ['traffic', 'industry', 'biomass']),
                description=intervention_dict.get('description', f"{intervention_type} intervention")
            )
            policy_interventions.append(policy_intervention)
        
        # If multiple interventions, use combined analysis
        if len(policy_interventions) > 1:
            result = self.analyze_combined_interventions(
                baseline_pollutants, policy_interventions, weather, hour, month
            )
        else:
            # Single intervention
            result = self.simulate_intervention(
                baseline_pollutants, policy_interventions[0], weather, hour, month
            )
        
        # Calculate predicted AQI
        predicted_aqi = int(result.predicted_aqi)
        
        # Prepare source changes
        source_changes = {}
        for source, change in result.source_changes.items():
            source_changes[source] = round(change, 2)
        
        return {
            'predicted_aqi': predicted_aqi,
            'source_changes': source_changes,
            'confidence': result.confidence,
            'aqi_reduction': result.aqi_reduction,
            'percentage_improvement': result.percentage_improvement
        }