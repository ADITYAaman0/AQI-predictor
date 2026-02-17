/**
 * Animation Controller - Forecast animation and timeline control
 * Manages 24-hour forecast animation with play/pause/scrub controls
 */

import config from '../config/config.js';

class AnimationController {
    constructor(layerManager, dataLoader) {
        this.layerManager = layerManager;
        this.dataLoader = dataLoader;
        
        this.isPlaying = false;
        this.currentHour = 0;
        this.maxHours = config.MAX_FORECAST_HOURS;
        this.animationSpeed = config.ANIMATION_SPEED;
        this.preloadFrames = config.ANIMATION_PRELOAD_FRAMES;
        
        this.animationTimer = null;
        this.forecastData = [];
        this.preloadedFrames = new Map();
        
        this.setupControls();
    }

    /**
     * Setup animation control event listeners
     */
    setupControls() {
        // Play button
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.startAnimation();
            });
        }

        // Pause button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.pauseAnimation();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAnimation();
            });
        }

        // Timeline slider
        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                const hour = parseInt(e.target.value);
                this.setHour(hour);
            });

            // Update slider properties
            timelineSlider.min = 0;
            timelineSlider.max = this.maxHours - 1;
            timelineSlider.value = 0;
        }
    }

    /**
     * Load forecast data for animation
     * @param {string} location - Location identifier
     * @returns {Promise<boolean>} - Success status
     */
    async loadForecastData(location) {
        try {
            const data = await this.dataLoader.fetchForecast(location);
            
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid forecast data format');
            }

            this.forecastData = data.slice(0, this.maxHours);
            
            // Preload initial frames
            await this.preloadFrames(0, Math.min(this.preloadFrames, this.forecastData.length));
            
            // Update timeline slider
            const timelineSlider = document.getElementById('timeline-slider');
            if (timelineSlider) {
                timelineSlider.max = this.forecastData.length - 1;
            }

            if (config.DEBUG) {
                console.log(`Loaded forecast data for ${this.forecastData.length} hours`);
            }

            return true;
        } catch (error) {
            console.error('Failed to load forecast data:', error);
            return false;
        }
    }

    /**
     * Start animation playback
     */
    startAnimation() {
        if (this.isPlaying || this.forecastData.length === 0) {
            return;
        }

        this.isPlaying = true;
        this.updatePlayPauseButtons();

        // Start animation loop
        this.animationTimer = setInterval(() => {
            this.nextFrame();
        }, this.animationSpeed);

        if (config.DEBUG) {
            console.log('Animation started');
        }

        this.emit('animationStarted');
    }

    /**
     * Pause animation playback
     */
    pauseAnimation() {
        if (!this.isPlaying) {
            return;
        }

        this.isPlaying = false;
        this.updatePlayPauseButtons();

        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }

        if (config.DEBUG) {
            console.log('Animation paused');
        }

        this.emit('animationPaused');
    }

    /**
     * Reset animation to beginning
     */
    resetAnimation() {
        this.pauseAnimation();
        this.setHour(0);

        if (config.DEBUG) {
            console.log('Animation reset');
        }

        this.emit('animationReset');
    }

    /**
     * Set animation to specific hour
     * @param {number} hour - Hour index (0-23)
     */
    setHour(hour) {
        if (hour < 0 || hour >= this.forecastData.length) {
            return;
        }

        this.currentHour = hour;
        this.updateTimeDisplay();
        this.updateTimelineSlider();
        this.displayFrame(hour);

        // Preload upcoming frames
        this.preloadUpcomingFrames();

        this.emit('hourChanged', hour);
    }

    /**
     * Move to next animation frame
     */
    nextFrame() {
        const nextHour = (this.currentHour + 1) % this.forecastData.length;
        
        // If we've reached the end, pause animation
        if (nextHour === 0 && this.currentHour === this.forecastData.length - 1) {
            this.pauseAnimation();
            return;
        }

        this.setHour(nextHour);
    }

    /**
     * Display specific animation frame with smooth transition
     * @param {number} hour - Hour index
     */
    displayFrame(hour) {
        if (!this.forecastData[hour]) {
            return;
        }

        const frameData = this.forecastData[hour];
        
        try {
            // Convert frame data to GeoJSON format
            const geoJsonData = this.convertFrameToGeoJSON(frameData);
            
            // Update map layer with smooth transition
            this.layerManager.updateLayer('markers', geoJsonData, { 
                animate: true,
                duration: this.animationSpeed * 0.5 // Transition takes half the frame duration
            });

            if (config.DEBUG) {
                console.log(`Displayed frame for hour ${hour} with smooth transition`);
            }
        } catch (error) {
            console.error(`Failed to display frame ${hour}:`, error);
        }
    }

    /**
     * Convert animation frame to GeoJSON format
     * @param {Object} frameData - Frame data
     * @returns {Object} - GeoJSON FeatureCollection
     */
    convertFrameToGeoJSON(frameData) {
        const features = frameData.stations?.map(station => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: station.coordinates
            },
            properties: {
                station_id: station.station_id,
                station_name: station.station_name || `Station ${station.station_id}`,
                aqi: station.aqi,
                category: station.category,
                color: station.color,
                confidence: station.confidence,
                timestamp: frameData.timestamp,
                forecast: true
            }
        })) || [];

        return {
            type: 'FeatureCollection',
            features,
            metadata: {
                hour: frameData.hour,
                timestamp: frameData.timestamp,
                count: features.length,
                forecast: true
            }
        };
    }

    /**
     * Preload animation frames for smooth playback
     * @param {number} startHour - Start hour
     * @param {number} count - Number of frames to preload
     */
    async preloadFrames(startHour, count) {
        const promises = [];
        
        for (let i = 0; i < count; i++) {
            const hour = (startHour + i) % this.forecastData.length;
            
            if (!this.preloadedFrames.has(hour)) {
                promises.push(this.preloadFrame(hour));
            }
        }

        await Promise.all(promises);
        
        if (config.DEBUG) {
            console.log(`Preloaded ${promises.length} frames starting from hour ${startHour}`);
        }
    }

    /**
     * Preload single animation frame
     * @param {number} hour - Hour index
     */
    async preloadFrame(hour) {
        try {
            const frameData = this.forecastData[hour];
            if (frameData) {
                const geoJsonData = this.convertFrameToGeoJSON(frameData);
                this.preloadedFrames.set(hour, geoJsonData);
            }
        } catch (error) {
            if (config.DEBUG) {
                console.warn(`Failed to preload frame ${hour}:`, error);
            }
        }
    }

    /**
     * Preload upcoming frames based on current position for smooth transitions
     */
    async preloadUpcomingFrames() {
        const startHour = (this.currentHour + 1) % this.forecastData.length;
        const framesToPreload = Math.min(this.preloadFrames, this.forecastData.length - 1);
        await this.preloadFrames(startHour, framesToPreload);
    }

    /**
     * Update play/pause button visibility
     */
    updatePlayPauseButtons() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');

        if (playBtn && pauseBtn) {
            if (this.isPlaying) {
                playBtn.classList.add('hidden');
                pauseBtn.classList.remove('hidden');
            } else {
                playBtn.classList.remove('hidden');
                pauseBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Update time display
     */
    updateTimeDisplay() {
        const currentHourElement = document.getElementById('current-hour');
        if (currentHourElement) {
            const hour = String(this.currentHour).padStart(2, '0');
            currentHourElement.textContent = `${hour}:00`;
        }
    }

    /**
     * Update timeline slider position
     */
    updateTimelineSlider() {
        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.value = this.currentHour;
        }
    }

    /**
     * Set animation speed
     * @param {number} speed - Speed in milliseconds per frame
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = Math.max(100, speed); // Minimum 100ms
        
        // Restart timer if playing
        if (this.isPlaying) {
            this.pauseAnimation();
            this.startAnimation();
        }
    }

    /**
     * Get current animation state
     * @returns {Object} - Animation state
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentHour: this.currentHour,
            maxHours: this.forecastData.length,
            animationSpeed: this.animationSpeed,
            hasData: this.forecastData.length > 0,
            preloadedFrames: this.preloadedFrames.size
        };
    }

    /**
     * Clear animation data and reset
     */
    clear() {
        this.pauseAnimation();
        this.forecastData = [];
        this.preloadedFrames.clear();
        this.currentHour = 0;
        this.updateTimeDisplay();
        this.updateTimelineSlider();
    }

    /**
     * Event emitter functionality
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`animation:${event}`, {
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
        window.addEventListener(`animation:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        window.removeEventListener(`animation:${event}`, callback);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.pauseAnimation();
        this.clear();
    }
}

export default AnimationController;