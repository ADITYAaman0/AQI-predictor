/**
 * Error Handler - Centralized error handling and user feedback
 * Manages error display, logging, and graceful degradation
 */

import config from '../config/config.js';

class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.isShowingError = false;
        this.errorCounts = new Map();
        this.maxRetries = 3;
        
        this.setupGlobalErrorHandlers();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'JavaScript Error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Handle network errors
        window.addEventListener('offline', () => {
            this.handleNetworkError(false);
        });

        window.addEventListener('online', () => {
            this.handleNetworkError(true);
        });
    }

    /**
     * Handle various types of errors
     * @param {Error|string} error - Error object or message
     * @param {string} context - Error context
     * @param {Object} metadata - Additional error metadata
     */
    handleError(error, context = 'Unknown', metadata = {}) {
        const errorInfo = this.parseError(error, context, metadata);
        
        // Log error
        this.logError(errorInfo);
        
        // Determine error handling strategy
        const strategy = this.getErrorStrategy(errorInfo);
        
        switch (strategy) {
            case 'show':
                this.showError(errorInfo);
                break;
            case 'toast':
                this.showToast(errorInfo);
                break;
            case 'silent':
                // Just log, don't show to user
                break;
            case 'retry':
                this.handleRetryableError(errorInfo);
                break;
            default:
                this.showError(errorInfo);
        }
    }

    /**
     * Parse error into standardized format
     * @param {Error|string} error - Error object or message
     * @param {string} context - Error context
     * @param {Object} metadata - Additional metadata
     * @returns {Object} - Parsed error information
     */
    parseError(error, context, metadata) {
        let message, code, stack;
        
        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            code = error.code || error.name;
        } else if (typeof error === 'string') {
            message = error;
            code = 'GENERIC_ERROR';
        } else {
            message = 'An unknown error occurred';
            code = 'UNKNOWN_ERROR';
        }

        return {
            message,
            code,
            context,
            stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...metadata
        };
    }

    /**
     * Determine error handling strategy
     * @param {Object} errorInfo - Parsed error information
     * @returns {string} - Handling strategy
     */
    getErrorStrategy(errorInfo) {
        const { code, context } = errorInfo;
        
        // Network errors
        if (code === 'NETWORK_ERROR' || code === 'TIMEOUT_ERROR') {
            return 'retry';
        }
        
        // Authentication errors
        if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
            return 'show';
        }
        
        // Data loading errors
        if (context.includes('Data') || context.includes('API')) {
            return 'toast';
        }
        
        // JavaScript errors
        if (context === 'JavaScript Error') {
            return config.DEBUG ? 'show' : 'silent';
        }
        
        // Default to showing error
        return 'show';
    }

    /**
     * Show error modal
     * @param {Object} errorInfo - Error information
     */
    showError(errorInfo) {
        if (this.isShowingError) {
            this.errorQueue.push(errorInfo);
            return;
        }

        this.isShowingError = true;
        
        const modal = document.getElementById('error-modal');
        const messageElement = document.getElementById('error-message');
        
        if (modal && messageElement) {
            // Set error message
            messageElement.textContent = this.getUserFriendlyMessage(errorInfo);
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Setup close handlers
            this.setupErrorModalHandlers(modal, errorInfo);
        }
    }

    /**
     * Setup error modal event handlers
     * @param {Element} modal - Modal element
     * @param {Object} errorInfo - Error information
     */
    setupErrorModalHandlers(modal, errorInfo) {
        const closeBtn = document.getElementById('close-error');
        const retryBtn = document.getElementById('retry-btn');
        const offlineBtn = document.getElementById('offline-btn');
        
        const closeModal = () => {
            modal.classList.add('hidden');
            this.isShowingError = false;
            this.processErrorQueue();
        };

        // Close button
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        // Retry button
        if (retryBtn) {
            retryBtn.onclick = () => {
                closeModal();
                this.handleRetry(errorInfo);
            };
        }

        // Offline button
        if (offlineBtn) {
            offlineBtn.onclick = () => {
                closeModal();
                this.handleOfflineMode();
            };
        }

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Auto-close after timeout for non-critical errors
        if (!this.isCriticalError(errorInfo)) {
            setTimeout(closeModal, config.ERROR_DISPLAY_DURATION);
        }
    }

    /**
     * Show toast notification
     * @param {Object} errorInfo - Error information
     */
    showToast(errorInfo) {
        // Create toast element if it doesn't exist
        let toast = document.getElementById('error-toast');
        if (!toast) {
            toast = this.createToastElement();
        }

        // Set message
        const messageElement = toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = this.getUserFriendlyMessage(errorInfo);
        }

        // Show toast
        toast.classList.add('show');

        // Auto-hide after delay
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    /**
     * Create toast element
     * @returns {Element} - Toast element
     */
    createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'error-toast';
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message"></div>
                <button class="toast-close">&times;</button>
            </div>
        `;

        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        // Add show class styles
        const style = document.createElement('style');
        style.textContent = `
            .error-toast.show {
                transform: translateX(0) !important;
            }
            .toast-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .toast-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                toast.classList.remove('show');
            };
        }

        document.body.appendChild(toast);
        return toast;
    }

    /**
     * Handle retryable errors
     * @param {Object} errorInfo - Error information
     */
    handleRetryableError(errorInfo) {
        const retryCount = this.errorCounts.get(errorInfo.code) || 0;
        
        if (retryCount < this.maxRetries) {
            this.errorCounts.set(errorInfo.code, retryCount + 1);
            
            // Show retry toast
            this.showToast({
                ...errorInfo,
                message: `Connection error. Retrying... (${retryCount + 1}/${this.maxRetries})`
            });
            
            // Emit retry event
            this.emit('errorRetry', errorInfo);
        } else {
            // Max retries reached, show error
            this.showError({
                ...errorInfo,
                message: 'Connection failed after multiple attempts. Please check your internet connection.'
            });
        }
    }

    /**
     * Handle network errors
     * @param {boolean} isOnline - Network status
     */
    handleNetworkError(isOnline) {
        const statusIndicator = document.getElementById('connection-status');
        
        if (statusIndicator) {
            if (isOnline) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusIndicator.querySelector('.status-text').textContent = 'Online';
                
                // Clear network error counts
                this.errorCounts.delete('NETWORK_ERROR');
                this.errorCounts.delete('TIMEOUT_ERROR');
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusIndicator.querySelector('.status-text').textContent = 'Offline';
                
                this.showToast({
                    message: 'You are offline. Showing cached data.',
                    code: 'OFFLINE',
                    context: 'Network'
                });
            }
        }
    }

    /**
     * Handle retry action
     * @param {Object} errorInfo - Error information
     */
    handleRetry(errorInfo) {
        // Reset error count for this error type
        this.errorCounts.delete(errorInfo.code);
        
        // Emit retry event
        this.emit('retry', errorInfo);
    }

    /**
     * Handle offline mode
     */
    handleOfflineMode() {
        this.emit('offlineMode');
        
        this.showToast({
            message: 'Switched to offline mode. Showing cached data.',
            code: 'OFFLINE_MODE',
            context: 'User Action'
        });
    }

    /**
     * Process queued errors
     */
    processErrorQueue() {
        if (this.errorQueue.length > 0 && !this.isShowingError) {
            const nextError = this.errorQueue.shift();
            this.showError(nextError);
        }
    }

    /**
     * Get user-friendly error message
     * @param {Object} errorInfo - Error information
     * @returns {string} - User-friendly message
     */
    getUserFriendlyMessage(errorInfo) {
        const { code, message, context } = errorInfo;
        
        const friendlyMessages = {
            'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
            'TIMEOUT_ERROR': 'The request timed out. Please try again.',
            'UNAUTHORIZED': 'You need to log in to access this feature.',
            'FORBIDDEN': 'You do not have permission to access this resource.',
            'NOT_FOUND': 'The requested data could not be found.',
            'SERVER_ERROR': 'A server error occurred. Please try again later.',
            'OFFLINE': 'You are currently offline.',
            'DATA_ERROR': 'There was a problem loading the data.',
            'UNKNOWN_ERROR': 'An unexpected error occurred.'
        };

        return friendlyMessages[code] || message || 'An error occurred. Please try again.';
    }

    /**
     * Check if error is critical
     * @param {Object} errorInfo - Error information
     * @returns {boolean} - Is critical
     */
    isCriticalError(errorInfo) {
        const criticalCodes = ['UNAUTHORIZED', 'FORBIDDEN', 'SERVER_ERROR'];
        return criticalCodes.includes(errorInfo.code);
    }

    /**
     * Log error
     * @param {Object} errorInfo - Error information
     */
    logError(errorInfo) {
        if (config.DEBUG) {
            console.error('Error Handler:', errorInfo);
        }
        
        // In production, you might want to send errors to a logging service
        if (config.ENVIRONMENT === 'production') {
            // Send to logging service
            this.sendToLoggingService(errorInfo);
        }
    }

    /**
     * Send error to logging service
     * @param {Object} errorInfo - Error information
     */
    sendToLoggingService(errorInfo) {
        // Implementation would depend on your logging service
        // This is a placeholder for production error logging
        try {
            // Example: send to external logging service
            // fetch('/api/v1/logs/error', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorInfo)
            // });
        } catch (loggingError) {
            // Don't let logging errors break the application
            console.warn('Failed to send error to logging service:', loggingError);
        }
    }

    /**
     * Event emitter functionality
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`errorHandler:${event}`, {
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
        window.addEventListener(`errorHandler:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        window.removeEventListener(`errorHandler:${event}`, callback);
    }

    /**
     * Clear error queue and reset state
     */
    clear() {
        this.errorQueue = [];
        this.errorCounts.clear();
        this.isShowingError = false;
    }
}

export default ErrorHandler;