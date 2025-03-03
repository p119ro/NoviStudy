// memory.js - Handles saving and loading user progress using cookies
(function() {
    // Main object to expose public methods
    window.QuickStudyMemory = {
        saveProgress,
        loadProgress,
        clearProgress,
        hasSavedProgress
    };

    // Cookie expiration time - 30 days by default
    const COOKIE_EXPIRY_DAYS = 30;
    
    /**
     * Saves the current user progress to cookies
     * @param {Object} state - The application state to save
     * @param {string} presetId - Identifier for the current preset/file
     */
    function saveProgress(state, presetId) {
        if (!presetId) {
            console.error("QuickStudyMemory: Cannot save progress without a preset ID");
            return;
        }
        
        // Only save essential state information to keep cookies small
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
        
        // Serialize and save data
        const serializedData = JSON.stringify(progressData);
        setCookie(`quickstudy_progress_${presetId}`, serializedData, COOKIE_EXPIRY_DAYS);
        
        console.log(`QuickStudyMemory: Progress saved for preset "${presetId}"`);
    }
    
    /**
     * Loads saved progress from cookies
     * @param {string} presetId - Identifier for the preset/file to load
     * @returns {Object|null} The saved progress data or null if none exists
     */
    function loadProgress(presetId) {
        if (!presetId) {
            console.error("QuickStudyMemory: Cannot load progress without a preset ID");
            return null;
        }
        
        const savedData = getCookie(`quickstudy_progress_${presetId}`);
        if (!savedData) {
            console.log(`QuickStudyMemory: No saved progress found for preset "${presetId}"`);
            return null;
        }
        
        try {
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
            console.error("QuickStudyMemory: Error parsing saved progress:", error);
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
        
        deleteCookie(`quickstudy_progress_${presetId}`);
        console.log(`QuickStudyMemory: Cleared progress for preset "${presetId}"`);
    }
    
    /**
     * Checks if there is saved progress for a specific preset
     * @param {string} presetId - Identifier for the preset/file to check
     * @returns {boolean} True if there is saved progress
     */
    function hasSavedProgress(presetId) {
        if (!presetId) return false;
        
        const savedData = getCookie(`quickstudy_progress_${presetId}`);
        return !!savedData;
    }
    
    // Cookie Helper Functions
    
    /**
     * Sets a cookie with the given name, value, and expiration days
     */
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }
    
    /**
     * Gets a cookie by name
     */
    function getCookie(name) {
        const cookieName = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        
        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i].trim();
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        
        return null;
    }
    
    /**
     * Deletes a cookie by name
     */
    function deleteCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
})();