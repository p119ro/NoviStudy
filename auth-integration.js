// QuickStudy Authentication Integration
// This file connects the authentication system with the main app

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing QuickStudy Auth Integration");
    
    // Check if QuickStudyAuth is available
    if (!window.QuickStudyAuth) {
        console.error("QuickStudyAuth not initialized. Make sure auth.js is loaded before this script.");
        return;
    }
    
    // State for tracking user and progress
    const state = {
        isLoggedIn: false,
        user: null,
        userProgress: null
    };
    
    // UI Elements
    let authButton;
    let userProfileButton;
    let welcomeMessage;
    let saveProgressButton;
    let userProgressContainer;
    
    // Create UI elements
    function createUIElements() {
        // Create auth button in the top right corner
        authButton = document.createElement('button');
        authButton.id = 'auth-button';
        authButton.className = 'auth-button';
        authButton.innerHTML = '<span class="auth-icon">👤</span> Login / Register';
        authButton.addEventListener('click', showAuthModal);
        
        // Create profile button (hidden by default)
        userProfileButton = document.createElement('button');
        userProfileButton.id = 'profile-button';
        userProfileButton.className = 'profile-button hidden';
        userProfileButton.innerHTML = '<img id="profile-thumb" src="" alt="Profile"> <span id="username-display"></span>';
        userProfileButton.addEventListener('click', showUserProfile);
        
        // Add elements to the UI
        const headerElement = document.querySelector('header');
        if (headerElement) {
            const authContainer = document.createElement('div');
            authContainer.className = 'auth-buttons';
            authContainer.appendChild(authButton);
            authContainer.appendChild(userProfileButton);
            headerElement.appendChild(authContainer);
            
            // Add welcome message element
            welcomeMessage = document.createElement('div');
            welcomeMessage.id = 'welcome-message';
            welcomeMessage.className = 'welcome-message hidden';
            headerElement.appendChild(welcomeMessage);
        } else {
            console.warn("Header element not found, auth buttons not added");
        }
        
        // Get save progress button if it exists, or create one
        saveProgressButton = document.getElementById('save-progress-btn');
        if (!saveProgressButton) {
            // Create save progress button for the results screen
            saveProgressButton = document.createElement('button');
            saveProgressButton.id = 'save-progress-btn';
            saveProgressButton.className = 'btn btn-primary hidden';
            saveProgressButton.textContent = 'Save My Progress';
            saveProgressButton.addEventListener('click', saveCurrentProgress);
            
            // Add it after restart button
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn && restartBtn.parentNode) {
                restartBtn.parentNode.insertBefore(saveProgressButton, restartBtn.nextSibling);
            }
        } else {
            saveProgressButton.addEventListener('click', saveCurrentProgress);
        }
        
        // Get user progress container on welcome screen
        userProgressContainer = document.getElementById('user-progress');
        
        // Add event listener to continue learning button
        const continueBtn = document.getElementById('continue-learning');
        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                showScreen('presets');
            });
        }
        
        // Add styles
        addStyles();
    }
    
    // Add CSS styles
    function addStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .auth-buttons {
                position: absolute;
                top: 15px;
                right: 15px;
                display: flex;
                gap: 10px;
                z-index: 100;
            }
            
            .auth-button, .profile-button {
                padding: 8px 12px;
                border-radius: 25px;
                border: none;
                background-color: var(--primary-color, #3498db);
                color: white;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }
            
            .auth-button:hover, .profile-button:hover {
                background-color: var(--primary-dark, #2980b9);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            
            .auth-icon {
                margin-right: 6px;
            }
            
            .profile-button {
                background-color: white;
                color: #333;
                border: 1px solid #ddd;
            }
            
            .profile-button:hover {
                background-color: #f5f5f5;
            }
            
            #profile-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                margin-right: 6px;
            }
            
            .welcome-message {
                position: absolute;
                top: 60px;
                right: 15px;
                background-color: #e8f5e9;
                border-left: 3px solid #4CAF50;
                color: #2e7d32;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                max-width: 300px;
                z-index: 100;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                animation: fade-in 0.5s ease, fade-out 0.5s ease 4.5s forwards;
            }
            
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fade-out {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
            
            .user-progress {
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                animation: slide-up 0.5s ease;
            }
            
            .progress-summary {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .progress-stat {
                text-align: center;
                padding: 10px;
                flex: 1;
                min-width: 100px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .progress-stat .stat-value {
                display: block;
                font-size: 2.5rem;
                font-weight: bold;
                color: var(--primary-color, #3498db);
                margin-bottom: 5px;
            }
            
            .progress-stat .stat-label {
                font-size: 0.9rem;
                color: #666;
            }
            
            body.dark-mode .profile-button {
                background-color: var(--dark-bg, #2c3e50);
                color: var(--dark-text, #ecf0f1);
                border-color: #546e7a;
            }
            
            body.dark-mode .profile-button:hover {
                background-color: #3d4b5c;
            }
            
            body.dark-mode .welcome-message {
                background-color: rgba(46, 125, 50, 0.2);
                color: #81c784;
            }
            
            body.dark-mode .user-progress {
                background-color: var(--card-bg-dark, #34495e);
            }
            
            body.dark-mode .progress-stat {
                background-color: var(--dark-bg, #2c3e50);
            }
            
            body.dark-mode .progress-stat .stat-label {
                color: #bdc3c7;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    // Show authentication modal
    function showAuthModal() {
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.classList.remove('hidden');
            
            // If user is already logged in, show profile screen
            if (state.isLoggedIn && state.user) {
                document.getElementById('profile-container').classList.remove('hidden');
                document.getElementById('login-container').classList.add('hidden');
                document.getElementById('register-container').classList.add('hidden');
            }
        }
    }
    
    // Show user profile screen
    function showUserProfile() {
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.classList.remove('hidden');
            document.getElementById('profile-container').classList.remove('hidden');
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('register-container').classList.add('hidden');
        }
    }
    
    // Show specific screen
    function showScreen(screenName) {
        // Get all screens
        const screens = document.querySelectorAll('.screen');
        
        // Hide all screens
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }
    
    // Update UI based on authentication state
    function updateUIForAuthState(user) {
        if (user) {
            // User is logged in
            state.isLoggedIn = true;
            state.user = user;
            
            // Update profile button
            userProfileButton.classList.remove('hidden');
            authButton.classList.add('hidden');
            
            // Update profile thumbnail and username
            const profileThumb = document.getElementById('profile-thumb');
            const usernameDisplay = document.getElementById('username-display');
            
            if (profileThumb && usernameDisplay) {
                if (user.photoURL) {
                    profileThumb.src = user.photoURL;
                } else {
                    profileThumb.src = 'https://via.placeholder.com/64';
                }
                
                usernameDisplay.textContent = user.displayName || user.email.split('@')[0];
            }
            
            // Show save progress button
            if (saveProgressButton) {
                saveProgressButton.classList.remove('hidden');
            }
            
            // Load user progress
            loadUserProgress();
            
            // Show welcome message
            showWelcomeMessage(`Welcome back, ${user.displayName || user.email.split('@')[0]}!`);
        } else {
            // User is logged out
            state.isLoggedIn = false;
            state.user = null;
            state.userProgress = null;
            
            // Update UI
            userProfileButton.classList.add('hidden');
            authButton.classList.remove('hidden');
            
            // Hide save progress button
            if (saveProgressButton) {
                saveProgressButton.classList.add('hidden');
            }
            
            // Hide user progress container
            if (userProgressContainer) {
                userProgressContainer.classList.add('hidden');
            }
        }
    }
    
    // Show welcome message
    function showWelcomeMessage(message) {
        if (!welcomeMessage) return;
        
        welcomeMessage.textContent = message;
        welcomeMessage.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            welcomeMessage.classList.add('hidden');
        }, 5000);
    }
    
    // Load user progress from Firestore
    function loadUserProgress() {
        if (!state.isLoggedIn || !state.user) {
            console.warn("Cannot load progress: User not logged in");
            return;
        }
        
        QuickStudyAuth.loadUserProgress()
            .then(progress => {
                state.userProgress = progress;
                console.log("User progress loaded:", progress);
                
                // Apply user progress to the app state
                applyUserProgress(progress);
                
                // Update user progress display on welcome screen
                updateUserProgressDisplay(progress);
            })
            .catch(error => {
                console.error("Error loading user progress:", error);
            });
    }
    
    // Update user progress display on welcome screen
    function updateUserProgressDisplay(progress) {
        if (!userProgressContainer) return;
        
        const masteredCategoriesEl = document.getElementById('mastered-categories');
        const totalQuestionsEl = document.getElementById('total-questions');
        const accuracyRateEl = document.getElementById('accuracy-rate');
        
        if (progress && progress.categories) {
            // Count mastered categories
            const masteredCategories = Object.values(progress.categories).filter(cat => cat.isMastered).length;
            
            // Total questions answered
            let totalQuestions = 0;
            let totalCorrect = 0;
            
            Object.values(progress.categories).forEach(cat => {
                totalQuestions += (cat.correct || 0) + (cat.incorrect || 0);
                totalCorrect += (cat.correct || 0);
            });
            
            // Calculate accuracy rate
            const accuracyRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
            
            // Update display
            if (masteredCategoriesEl) masteredCategoriesEl.textContent = masteredCategories;
            if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
            if (accuracyRateEl) accuracyRateEl.textContent = `${Math.round(accuracyRate)}%`;
            
            // Show the container
            userProgressContainer.classList.remove('hidden');
        } else {
            // No progress data, set to defaults
            if (masteredCategoriesEl) masteredCategoriesEl.textContent = '0';
            if (totalQuestionsEl) totalQuestionsEl.textContent = '0';
            if (accuracyRateEl) accuracyRateEl.textContent = '0%';
            
            // Show the container anyway to indicate they're logged in
            userProgressContainer.classList.remove('hidden');
        }
    }
    
    // Apply user progress to the app state
    function applyUserProgress(progress) {
        if (!progress || !progress.categories) return;
        
        // Get the main app state if available
        const appState = window.state;
        if (!appState) {
            console.warn("App state not available, progress not applied");
            return;
        }
        
        // Update app state with user progress
        try {
            // Update categories with saved mastery and performance data
            if (appState.categories && progress.categories) {
                Object.keys(progress.categories).forEach(category => {
                    if (appState.categories[category]) {
                        appState.categories[category] = {
                            ...appState.categories[category],
                            ...progress.categories[category]
                        };
                    }
                });
            }
            
            // Update category performance data
            if (appState.categoryPerformance && progress.categoryPerformance) {
                Object.keys(progress.categoryPerformance).forEach(category => {
                    if (appState.categoryPerformance[category]) {
                        appState.categoryPerformance[category] = {
                            ...appState.categoryPerformance[category],
                            ...progress.categoryPerformance[category]
                        };
                    }
                });
            }
            
            // Update global stats
            if (progress.stats) {
                appState.correctAnswers = progress.stats.totalCorrect || 0;
                appState.incorrectAnswers = progress.stats.totalIncorrect || 0;
                appState.totalTime = progress.stats.totalTime || 0;
                appState.mastery = progress.stats.overallMastery || 0;
            }
            
            // Update UI to reflect the loaded progress
            if (typeof appState.updateCategoryMasteryOverview === 'function') {
                appState.updateCategoryMasteryOverview();
            }
            
            if (typeof appState.updateStats === 'function') {
                appState.updateStats();
            }
            
            console.log("User progress applied to app state");
        } catch (error) {
            console.error("Error applying user progress:", error);
        }
    }
    
    // Save current app state to user's Firestore document
    function saveCurrentProgress() {
        if (!state.isLoggedIn || !state.user) {
            console.warn("Cannot save progress: User not logged in");
            // Prompt user to login to save progress
            showAuthModal();
            return;
        }
        
        // Get app state
        const appState = window.state;
        if (!appState) {
            console.warn("App state not available, progress not saved");
            return;
        }
        
        try {
            // Create progress object
            const progress = {
                categories: {},
                categoryPerformance: {},
                lastSaved: new Date()
            };
            
            // Add category data
            if (appState.categories) {
                Object.keys(appState.categories).forEach(category => {
                    const catData = appState.categories[category];
                    if (catData) {
                        progress.categories[category] = {
                            correct: catData.correct || 0,
                            incorrect: catData.incorrect || 0,
                            totalTime: catData.totalTime || 0,
                            mastery: catData.mastery || 0,
                            isMastered: catData.isMastered || false
                        };
                    }
                });
            }
            
            // Add category performance data
            if (appState.categoryPerformance) {
                Object.keys(appState.categoryPerformance).forEach(category => {
                    const perfData = appState.categoryPerformance[category];
                    if (perfData) {
                        progress.categoryPerformance[category] = {
                            consecutiveCorrect: perfData.consecutiveCorrect || 0,
                            timeWithinLimit: perfData.timeWithinLimit || 0,
                            totalAttempts: perfData.totalAttempts || 0,
                            masteryScore: perfData.masteryScore || 0
                        };
                    }
                });
            }
            
            // Add overall statistics
            progress.stats = {
                totalCorrect: appState.correctAnswers || 0,
                totalIncorrect: appState.incorrectAnswers || 0,
                totalTime: appState.totalTime || 0,
                overallMastery: appState.mastery || 0
            };
            
            // Show saving status
            if (saveProgressButton) {
                const originalText = saveProgressButton.textContent;
                saveProgressButton.textContent = "Saving...";
                saveProgressButton.disabled = true;
            }
            
            // Save to Firestore
            QuickStudyAuth.saveUserProgress(progress)
                .then(() => {
                    console.log("Progress saved successfully");
                    
                    // Update button text to show success
                    if (saveProgressButton) {
                        saveProgressButton.textContent = "✓ Saved!";
                        
                        // Reset button after a delay
                        setTimeout(() => {
                            saveProgressButton.textContent = "Save My Progress";
                            saveProgressButton.disabled = false;
                        }, 2000);
                    }
                    
                    // Show confirmation message
                    showWelcomeMessage("Your progress has been saved!");
                })
                .catch(error => {
                    console.error("Error saving progress:", error);
                    
                    // Update button to show error
                    if (saveProgressButton) {
                        saveProgressButton.textContent = "Error Saving";
                        
                        // Reset button after a delay
                        setTimeout(() => {
                            saveProgressButton.textContent = "Save My Progress";
                            saveProgressButton.disabled = false;
                        }, 2000);
                    }
                });
        } catch (error) {
            console.error("Error preparing progress data:", error);
            
            // Update button to show error
            if (saveProgressButton) {
                saveProgressButton.textContent = "Error";
                
                // Reset button after a delay
                setTimeout(() => {
                    saveProgressButton.textContent = "Save My Progress";
                    saveProgressButton.disabled = false;
                }, 2000);
            }
        }
    }
    
    // Register event listeners
    function registerEventListeners() {
        // Listen for app state changes to trigger auto-save
        window.addEventListener('QuickStudy.stateChanged', function(event) {
            // Save progress when app state changes (if user is logged in)
            if (state.isLoggedIn) {
                // Throttle saving to avoid excessive writes
                if (window.saveProgressDebounceTimeout) {
                    clearTimeout(window.saveProgressDebounceTimeout);
                }
                
                window.saveProgressDebounceTimeout = setTimeout(saveCurrentProgress, 2000);
            }
        });
        
        // Listen for result screen to show save button
        document.addEventListener('QuickStudy.resultScreenShown', function() {
            if (state.isLoggedIn && saveProgressButton) {
                saveProgressButton.classList.remove('hidden');
            }
        });
        
        // Listen for authentication state changes
        QuickStudyAuth.onAuthStateChanged(updateUIForAuthState);
    }
    
    // Initialize
    function initialize() {
        createUIElements();
        registerEventListeners();
        
        // Expose app state to the window for the auth system to access
        if (!window.QuickStudyAppState && window.state) {
            window.QuickStudyAppState = window.state;
        }
        
        console.log("QuickStudy Auth Integration initialized");
    }
    
    // Start initialization
    initialize();
});

// Expose the save progress function globally
window.saveQuickStudyProgress = function() {
    // Create a custom event for saving progress
    const event = new CustomEvent('QuickStudy.stateChanged');
    window.dispatchEvent(event);
};