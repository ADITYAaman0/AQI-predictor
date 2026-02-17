/**
 * Filter Controller - District-based filtering and UI controls
 * Manages filter selection and application to map layers
 */

import config from '../config/config.js';

class FilterController {
    constructor(layerManager, dataLoader) {
        this.layerManager = layerManager;
        this.dataLoader = dataLoader;
        
        this.currentFilters = {
            district: '',
            city: '',
            state: '',
            minAQI: undefined,
            maxAQI: undefined,
            category: ''
        };
        
        this.districts = [];
        this.cities = [];
        this.states = [];
        
        this.setupControls();
    }

    /**
     * Setup filter control event listeners
     */
    setupControls() {
        // District filter
        const districtFilter = document.getElementById('district-filter');
        if (districtFilter) {
            districtFilter.addEventListener('change', (e) => {
                this.setDistrictFilter(e.target.value);
            });
        }

        // City filter (if exists)
        const cityFilter = document.getElementById('city-filter');
        if (cityFilter) {
            cityFilter.addEventListener('change', (e) => {
                this.setCityFilter(e.target.value);
            });
        }

        // State filter (if exists)
        const stateFilter = document.getElementById('state-filter');
        if (stateFilter) {
            stateFilter.addEventListener('change', (e) => {
                this.setStateFilter(e.target.value);
            });
        }

        // AQI range filters (if exist)
        const minAQIFilter = document.getElementById('min-aqi-filter');
        if (minAQIFilter) {
            minAQIFilter.addEventListener('input', (e) => {
                this.setMinAQI(parseInt(e.target.value) || undefined);
            });
        }

        const maxAQIFilter = document.getElementById('max-aqi-filter');
        if (maxAQIFilter) {
            maxAQIFilter.addEventListener('input', (e) => {
                this.setMaxAQI(parseInt(e.target.value) || undefined);
            });
        }

        // Category filter (if exists)
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.setCategoryFilter(e.target.value);
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    /**
     * Load available districts from station data
     * @param {Object} data - GeoJSON data with station information
     */
    loadAvailableDistricts(data) {
        if (!data || !data.features) {
            return;
        }

        // Extract unique districts
        const districtSet = new Set();
        const citySet = new Set();
        const stateSet = new Set();

        data.features.forEach(feature => {
            const props = feature.properties;
            
            if (props.district) {
                districtSet.add(props.district);
            }
            
            if (props.city) {
                citySet.add(props.city);
            }
            
            if (props.state) {
                stateSet.add(props.state);
            }
        });

        this.districts = Array.from(districtSet).sort();
        this.cities = Array.from(citySet).sort();
        this.states = Array.from(stateSet).sort();

        // Update UI dropdowns
        this.updateDistrictDropdown();
        this.updateCityDropdown();
        this.updateStateDropdown();

        if (config.DEBUG) {
            console.log(`Loaded ${this.districts.length} districts, ${this.cities.length} cities, ${this.states.length} states`);
        }
    }

    /**
     * Update district dropdown with available options
     */
    updateDistrictDropdown() {
        const districtFilter = document.getElementById('district-filter');
        if (!districtFilter) return;

        // Clear existing options except "All Districts"
        districtFilter.innerHTML = '<option value="">All Districts</option>';

        // Add district options
        this.districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilter.appendChild(option);
        });
    }

    /**
     * Update city dropdown with available options
     */
    updateCityDropdown() {
        const cityFilter = document.getElementById('city-filter');
        if (!cityFilter) return;

        cityFilter.innerHTML = '<option value="">All Cities</option>';

        this.cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            cityFilter.appendChild(option);
        });
    }

    /**
     * Update state dropdown with available options
     */
    updateStateDropdown() {
        const stateFilter = document.getElementById('state-filter');
        if (!stateFilter) return;

        stateFilter.innerHTML = '<option value="">All States</option>';

        this.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateFilter.appendChild(option);
        });
    }

    /**
     * Set district filter
     * @param {string} district - District name
     */
    setDistrictFilter(district) {
        this.currentFilters.district = district;
        this.applyFilters();
        this.emit('filterChanged', { type: 'district', value: district });
    }

    /**
     * Set city filter
     * @param {string} city - City name
     */
    setCityFilter(city) {
        this.currentFilters.city = city;
        this.applyFilters();
        this.emit('filterChanged', { type: 'city', value: city });
    }

    /**
     * Set state filter
     * @param {string} state - State name
     */
    setStateFilter(state) {
        this.currentFilters.state = state;
        this.applyFilters();
        this.emit('filterChanged', { type: 'state', value: state });
    }

    /**
     * Set minimum AQI filter
     * @param {number} minAQI - Minimum AQI value
     */
    setMinAQI(minAQI) {
        this.currentFilters.minAQI = minAQI;
        this.applyFilters();
        this.emit('filterChanged', { type: 'minAQI', value: minAQI });
    }

    /**
     * Set maximum AQI filter
     * @param {number} maxAQI - Maximum AQI value
     */
    setMaxAQI(maxAQI) {
        this.currentFilters.maxAQI = maxAQI;
        this.applyFilters();
        this.emit('filterChanged', { type: 'maxAQI', value: maxAQI });
    }

    /**
     * Set category filter
     * @param {string} category - AQI category
     */
    setCategoryFilter(category) {
        this.currentFilters.category = category;
        this.applyFilters();
        this.emit('filterChanged', { type: 'category', value: category });
    }

    /**
     * Apply current filters to map layers
     */
    applyFilters() {
        // Get current layer type from layer manager
        const currentLayerType = this.layerManager.getCurrentLayerType();
        
        if (!currentLayerType) {
            if (config.DEBUG) {
                console.warn('No active layer to filter');
            }
            return;
        }

        // Apply filters to the current layer
        this.layerManager.applyFilters(currentLayerType, this.currentFilters);

        // Update filter status display
        this.updateFilterStatus();

        if (config.DEBUG) {
            console.log('Filters applied:', this.currentFilters);
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentFilters = {
            district: '',
            city: '',
            state: '',
            minAQI: undefined,
            maxAQI: undefined,
            category: ''
        };

        // Reset UI controls
        const districtFilter = document.getElementById('district-filter');
        if (districtFilter) districtFilter.value = '';

        const cityFilter = document.getElementById('city-filter');
        if (cityFilter) cityFilter.value = '';

        const stateFilter = document.getElementById('state-filter');
        if (stateFilter) stateFilter.value = '';

        const minAQIFilter = document.getElementById('min-aqi-filter');
        if (minAQIFilter) minAQIFilter.value = '';

        const maxAQIFilter = document.getElementById('max-aqi-filter');
        if (maxAQIFilter) maxAQIFilter.value = '';

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) categoryFilter.value = '';

        // Reapply (which will show all data)
        this.applyFilters();

        this.emit('filtersCleared');

        if (config.DEBUG) {
            console.log('Filters cleared');
        }
    }

    /**
     * Get current filter state
     * @returns {Object} - Current filters
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    /**
     * Check if any filters are active
     * @returns {boolean} - True if filters are active
     */
    hasActiveFilters() {
        return this.currentFilters.district !== '' ||
               this.currentFilters.city !== '' ||
               this.currentFilters.state !== '' ||
               this.currentFilters.minAQI !== undefined ||
               this.currentFilters.maxAQI !== undefined ||
               this.currentFilters.category !== '';
    }

    /**
     * Update filter status display
     */
    updateFilterStatus() {
        const filterStatus = document.getElementById('filter-status');
        if (!filterStatus) return;

        if (this.hasActiveFilters()) {
            const activeFilters = [];
            
            if (this.currentFilters.district) {
                activeFilters.push(`District: ${this.currentFilters.district}`);
            }
            if (this.currentFilters.city) {
                activeFilters.push(`City: ${this.currentFilters.city}`);
            }
            if (this.currentFilters.state) {
                activeFilters.push(`State: ${this.currentFilters.state}`);
            }
            if (this.currentFilters.category) {
                activeFilters.push(`Category: ${this.currentFilters.category}`);
            }
            if (this.currentFilters.minAQI !== undefined || this.currentFilters.maxAQI !== undefined) {
                const min = this.currentFilters.minAQI || 0;
                const max = this.currentFilters.maxAQI || 500;
                activeFilters.push(`AQI: ${min}-${max}`);
            }

            filterStatus.textContent = `Active filters: ${activeFilters.join(', ')}`;
            filterStatus.classList.add('active');
        } else {
            filterStatus.textContent = 'No filters active';
            filterStatus.classList.remove('active');
        }
    }

    /**
     * Get filter statistics
     * @returns {Object} - Filter statistics
     */
    getStats() {
        return {
            availableDistricts: this.districts.length,
            availableCities: this.cities.length,
            availableStates: this.states.length,
            hasActiveFilters: this.hasActiveFilters(),
            currentFilters: this.getCurrentFilters()
        };
    }

    /**
     * Event emitter functionality
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`filter:${event}`, {
            detail: data
        });
        window.dispatchEvent(customEvent);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        window.addEventListener(`filter:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        window.removeEventListener(`filter:${event}`, callback);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.clearFilters();
    }
}

export default FilterController;
