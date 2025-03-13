// memory.js - Handles saving and loading user progress using localStorage
(function() {
    // Main object to expose public methods
    window.QuickStudyMemory = {
        saveProgress,
        loadProgress,
        clearProgress,
        hasSavedProgress,
        savePreferences,
        loadPreferences
    };

    // Storage prefix to avoid conflicts with other apps
    const STORAGE_PREFIX = 'quickstudy_progress_';
    const PREFERENCES_KEY = 'quickstudy_preferences';
    
    // Data expiration time - 30 days by default (in milliseconds)
    const DATA_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    
    /**
     * Saves the current user progress to localStorage
     * @param {Object} state - The application state to save
     * @param {string} presetId - Identifier for the current preset/file
     */
    function saveProgress(state, presetId) {
        if (!presetId) {
            console.error("QuickStudyMemory: Cannot save progress without a preset ID");
            return;
        }
        
        // Only save essential state information
        const progressData = {
            currentQuestionIndex: state.currentQuestionIndex,
            correctAnswers: state.correctAnswers,
            incorrectAnswers: state.incorrectAnswers,
            totalTime: state.totalTime,
            questionTimes: state.questionTimes,
            categories: {},
            categoryPerformance: {},
            timestamp: Date.now()
        };
        
        // For categories, only save statistics
        if (state.categories) {
            Object.keys(state.categories).forEach(category => {
                progressData.categories[category] = {
                    correct: state.categories[category].correct,
                    incorrect: state.categories[category].incorrect,
                    times: state.categories[category].times,
                    totalTime: state.categories[category].totalTime,
                    mastery: state.categories[category].mastery,
                    isMastered: state.categories[category].isMastered
                };
            });
        }
        
        // For category performance, save tracking data
        if (state.categoryPerformance) {
            Object.keys(state.categoryPerformance).forEach(category => {
                progressData.categoryPerformance[category] = {
                    consecutiveCorrect: state.categoryPerformance[category].consecutiveCorrect,
                    timeWithinLimit: state.categoryPerformance[category].timeWithinLimit,
                    totalAttempts: state.categoryPerformance[category].totalAttempts,
                    recentResults: state.categoryPerformance[category].recentResults,
                    recentTimeResults: state.categoryPerformance[category].recentTimeResults,
                    masteryScore: state.categoryPerformance[category].masteryScore
                };
            });
        }
        
        try {
            // Store in localStorage
            const storageKey = STORAGE_PREFIX + presetId;
            localStorage.setItem(storageKey, JSON.stringify(progressData));
            console.log(`QuickStudyMemory: Progress saved for preset "${presetId}"`);
            return true;
        } catch (error) {
            console.error("QuickStudyMemory: Error saving progress:", error);
            return false;
        }
    }
    
    /**
     * Loads saved progress from localStorage
     * @param {string} presetId - Identifier for the preset/file to load
     * @returns {Object|null} The saved progress data or null if none exists
     */
    function loadProgress(presetId) {
        if (!presetId) {
            console.error("QuickStudyMemory: Cannot load progress without a preset ID");
            return null;
        }
        
        try {
            const storageKey = STORAGE_PREFIX + presetId;
            const savedData = localStorage.getItem(storageKey);
            
            if (!savedData) {
                console.log(`QuickStudyMemory: No saved progress found for preset "${presetId}"`);
                return null;
            }
            
            const progressData = JSON.parse(savedData);
            
            // Check if data is too old (7 days)
            const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (progressData.timestamp && (Date.now() - progressData.timestamp > MAX_AGE_MS)) {
                console.log(`QuickStudyMemory: Saved progress for "${presetId}" is too old, discarding`);
                clearProgress(presetId);
                return null;
            }
            
            console.log(`QuickStudyMemory: Loaded progress for preset "${presetId}"`);
            return progressData;
        } catch (error) {
            console.error("QuickStudyMemory: Error loading saved progress:", error);
            return null;
        }
    }
    
    /**
     * Clears saved progress for a specific preset
     * @param {string} presetId - Identifier for the preset/file to clear
     */
    function clearProgress(presetId) {
        if (!presetId) {
            console.error("QuickStudyMemory: Cannot clear progress without a preset ID");
            return;
        }
        
        try {
            const storageKey = STORAGE_PREFIX + presetId;
            localStorage.removeItem(storageKey);
            console.log(`QuickStudyMemory: Cleared progress for preset "${presetId}"`);
            return true;
        } catch (error) {
            console.error("QuickStudyMemory: Error clearing progress:", error);
            return false;
        }
    }
    
    /**
     * Checks if there is saved progress for a specific preset
     * @param {string} presetId - Identifier for the preset/file to check
     * @returns {boolean} True if there is saved progress
     */
    function hasSavedProgress(presetId) {
        if (!presetId) return false;
        
        try {
            const storageKey = STORAGE_PREFIX + presetId;
            const savedData = localStorage.getItem(storageKey);
            const result = !!savedData;
            console.log(`QuickStudyMemory: Checking for saved progress for preset "${presetId}": ${result}`);
            return result;
        } catch (error) {
            console.error("QuickStudyMemory: Error checking for saved progress:", error);
            return false;
        }
    }
    
    /**
     * Saves user preferences to localStorage
     * @param {Object} preferences - The user preferences to save
     * @returns {boolean} True if successful
     */
    function savePreferences(preferences) {
        try {
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
            console.log("QuickStudyMemory: User preferences saved");
            return true;
        } catch (error) {
            console.error("QuickStudyMemory: Error saving preferences:", error);
            return false;
        }
    }
    
    /**
     * Loads user preferences from localStorage
     * @returns {Object|null} The saved preferences or null if none exist
     */
    function loadPreferences() {
        try {
            const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
            
            if (!savedPrefs) {
                console.log("QuickStudyMemory: No saved preferences found");
                return null;
            }
            
            const preferences = JSON.parse(savedPrefs);
            console.log("QuickStudyMemory: Loaded user preferences");
            return preferences;
        } catch (error) {
            console.error("QuickStudyMemory: Error loading preferences:", error);
            return null;
        }
    }
    
    // Helper function to clean up old saved data
    function cleanupOldData() {
        try {
            const now = Date.now();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(STORAGE_PREFIX)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.timestamp && (now - data.timestamp > DATA_EXPIRY_MS)) {
                            localStorage.removeItem(key);
                            console.log(`QuickStudyMemory: Removed expired data for key ${key}`);
                        }
                    } catch (e) {
                        // If data is corrupted, remove it
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.error("Error cleaning up old data:", error);
        }
    }
    
    // Run cleanup when the module loads
    cleanupOldData();
    
    // Quick feature detection for localStorage
    try {
        const testKey = STORAGE_PREFIX + 'test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log("QuickStudyMemory: localStorage is available and working");
    } catch (e) {
        console.error("QuickStudyMemory: localStorage is not available, progress saving will not work", e);
    }
})();