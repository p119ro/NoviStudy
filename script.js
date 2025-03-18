// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded");
    
    // Check if QuickStudyAI is available
    console.log("QuickStudyAI availability check:", !!window.QuickStudyAI);
    
    if (!window.QuickStudyAI) {
        console.error("QuickStudyAI not initialized. Check if answer-comparison.js is loaded correctly.");
        
        // Create a fallback if missing
        window.QuickStudyAI = {
            compareAnswers: function(userAnswer, expectedAnswer, question, callback) {
                console.log("Using fallback answer comparison");
                // Simple exact match
                callback(userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase());
            },
            getExplanation: function(userAnswer, expectedAnswer, question, wasCorrect, callback) {
                console.log("Using fallback explanation");
                callback(getDefaultExplanation(userAnswer, expectedAnswer, question, wasCorrect));
            }
        };
        console.log("Created fallback QuickStudyAI");
    } else {
        console.log("QuickStudyAI initialized successfully");
    }

    // Variable to track the current question and answer state for explanations
    let currentExplanationState = {
        question: '',
        userAnswer: '',
        correctAnswer: '',
        wasCorrect: false
    };
    
    // App state
    const state = {
        questions: [],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        totalTime: 0,
        questionStartTime: 0,
        questionTimes: [],
        mastery: 0,
        selectedMCQOption: null,
        isMCQ: false,
        // Category tracking
        categories: {},
        // Adaptive mastery tracking
        categoryPerformance: {},
        // Presets
        availablePresets: [],
        // Thresholds for mastery
        masteryThresholds: {
            minAccuracy: 85, // 85% correct
            maxTimeOverTarget: 1.5,  // 1.5x target time
            masteryThreshold: 90 // Percentage needed to consider a category mastered
        },
        originalQuestions: [], // Store complete question set
        selectedCategories: [], // Track selected categories
        allCategoriesSelected: true, // Default: all categories selected
        studyStarted: false, // Track if study session has started
        answeredQuestions: [],
        // Settings
        isDarkMode: false,
        useTimeScoring: true,
        useAdaptiveMastery: true,
        requiredCorrectAnswers: 10,
        // Answer processing state
        isProcessingAnswer: false,
        // After other state properties
        currentPresetId: null, // Used to track which preset is currently loaded
        originalQuestions: [], // Store original question set for reference
        selectedCategories: [], // Track which categories are selected
        allCategoriesSelected: true, // Track if all categories are selected (default)
    };

    // DOM elements
    const elements = {
        screens: {
            welcome: document.getElementById('welcome-screen'),
            presets: document.getElementById('presets-screen'),
            study: document.getElementById('study-screen'),
            feedback: document.getElementById('feedback-screen'),
            results: document.getElementById('results-screen')
        },
        header: document.querySelector('header'),
        csvUpload: document.getElementById('csv-upload'),
        usePresetBtn: document.getElementById('use-preset-btn'),
        presetsContainer: document.getElementById('presets-container'),
        presetBackBtn: document.getElementById('preset-back-btn'),
        questionCounter: document.getElementById('question-counter'),
        categoryDisplay: document.getElementById('category-display'),
        difficultyDisplay: document.getElementById('difficulty-display'),
        masteryLevel: document.getElementById('mastery-level'),
        masteryProgressFill: document.querySelector('.mastery-progress-fill'),
        progressFill: document.getElementById('progress-fill'),
        timer: document.getElementById('timer'),
        targetTime: document.getElementById('target-time'),
        mastery: document.getElementById('mastery-badge'),
        questionDisplay: document.getElementById('question-display'),
        frqContainer: document.getElementById('frq-container'),
        mcqContainer: document.getElementById('mcq-container'),
        mcqOptions: document.getElementById('mcq-options'),
        mathPreview: null, // Will be set in setupMathInput
        answerInput: null, // Will be set in setupMathInput
        submitAnswer: document.getElementById('submit-answer'),
        correctCount: document.getElementById('correct-count'),
        incorrectCount: document.getElementById('incorrect-count'),
        avgTime: document.getElementById('avg-time'),
        answerFeedback: document.getElementById('answer-feedback'),
        timeFeedback: document.getElementById('time-feedback'),
        timeScoreFeedback: document.getElementById('time-score-feedback'),
        masteryFeedback: document.getElementById('mastery-feedback'),
        categoryMasteryOverview: document.getElementById('category-mastery-overview'),
        nextQuestion: document.getElementById('next-question'),
        finalAccuracy: document.getElementById('final-accuracy'),
        finalAvgTime: document.getElementById('final-avg-time'),
        finalMastery: document.getElementById('final-mastery'),
        categoryResults: document.getElementById('category-results-container'),
        finalMasteryFeedback: document.getElementById('final-mastery-feedback'),
        restartBtn: document.getElementById('restart-btn'),
        // New elements for explanation feature
        seeExplanation: document.getElementById('see-explanation'),
        explanationContainer: document.getElementById('explanation-container'),
        explanationLoading: document.querySelector('.explanation-loading'),
        explanationContent: document.getElementById('explanation-content'),
        // Settings elements
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeModal: document.querySelector('.close'),
        darkModeToggle: document.getElementById('dark-mode-toggle'),
        timeScoringToggle: document.getElementById('time-scoring-toggle'),
        adaptiveMasteryToggle: document.getElementById('adaptive-mastery-toggle'),
        consecutiveCorrectInput: document.getElementById('consecutive-correct-input')
    };

    // Default time if not specified
    const DEFAULT_TIME = 10; // seconds

    // Timer variables
    let timerInterval;
    let elapsedTime = 0;

    // Welcome screen event listeners
    elements.csvUpload && elements.csvUpload.addEventListener('change', handleCSVUpload);
    // We'll initialize the subject view instead of using the preset button
    // elements.usePresetBtn.addEventListener('click', showPresetsScreen);
    elements.presetBackBtn && elements.presetBackBtn.addEventListener('click', () => {
        // Check if we're in a category view
        if (state.currentSubjectCategory) {
            state.currentSubjectCategory = null;
            displaySubjectCategories();
        } else {
            showScreen('welcome');
        }
    });
    elements.header && elements.header.addEventListener('click', navigateHome);
    
    // Format tabs
    const formatTabs = document.querySelectorAll('.format-tab');
    if (formatTabs) {
        formatTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                formatTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.format-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });
    }

    // Study screen event listeners
    elements.submitAnswer && elements.submitAnswer.addEventListener('click', submitAnswer);
    elements.nextQuestion && elements.nextQuestion.addEventListener('click', showNextQuestion);
    elements.restartBtn && elements.restartBtn.addEventListener('click', restartApp);
    
    // Explanation feature event listener
    elements.seeExplanation && elements.seeExplanation.addEventListener('click', showExplanation);

    // Settings Event Listeners
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', openSettings);
    }
    
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeSettings);
    }
    
    if (elements.darkModeToggle) {
        elements.darkModeToggle.addEventListener('change', toggleDarkMode);
    }
    
    if (elements.timeScoringToggle) {
        elements.timeScoringToggle.addEventListener('change', toggleTimeScoring);
    }
    
    if (elements.adaptiveMasteryToggle) {
        elements.adaptiveMasteryToggle.addEventListener('change', toggleAdaptiveMastery);
    }
    
    if (elements.consecutiveCorrectInput) {
        elements.consecutiveCorrectInput.addEventListener('change', updateConsecutiveCorrect);
    }

    // Close settings when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === elements.settingsModal) {
            closeSettings();
        }
    });

    // Set up the improved math input
    setupMathInput();

    // Initialize presets
    fetchPresetFiles();
    
    loadUserPreferences();

    // Function to load user preferences
    function loadUserPreferences() {
        if (window.QuickStudyMemory && typeof window.QuickStudyMemory.loadPreferences === 'function') {
            const savedPrefs = window.QuickStudyMemory.loadPreferences();
            
            if (savedPrefs) {
                // Apply saved preferences to state
                state.isDarkMode = savedPrefs.isDarkMode ?? false;
                state.useTimeScoring = savedPrefs.useTimeScoring ?? true;
                state.useAdaptiveMastery = savedPrefs.useAdaptiveMastery ?? true;
                state.requiredCorrectAnswers = savedPrefs.requiredCorrectAnswers ?? 10;
                
                // Update UI to reflect saved preferences
                if (elements.darkModeToggle) {
                    elements.darkModeToggle.checked = state.isDarkMode;
                    document.body.classList.toggle('dark-mode', state.isDarkMode);
                }
                
                if (elements.timeScoringToggle) {
                    elements.timeScoringToggle.checked = state.useTimeScoring;
                }
                
                if (elements.adaptiveMasteryToggle) {
                    elements.adaptiveMasteryToggle.checked = state.useAdaptiveMastery;
                }
                
                if (elements.consecutiveCorrectInput) {
                    elements.consecutiveCorrectInput.value = state.requiredCorrectAnswers;
                }
                
                console.log("Loaded user preferences:", savedPrefs);
            }
        }
    }

    // Function to save user preferences
    function saveUserPreferences() {
        if (window.QuickStudyMemory && typeof window.QuickStudyMemory.savePreferences === 'function') {
            const preferences = {
                isDarkMode: state.isDarkMode,
                useTimeScoring: state.useTimeScoring,
                useAdaptiveMastery: state.useAdaptiveMastery,
                requiredCorrectAnswers: state.requiredCorrectAnswers
            };
            
            window.QuickStudyMemory.savePreferences(preferences);
            console.log("Saved user preferences:", preferences);
        }
    }

    // Function to generate consistent preset IDs
    function generatePresetId(filename) {
        if (!filename) return '';
        
        // Strip the path and extension
        let id = filename;
        
        // Remove path if present
        if (id.includes('/')) {
            id = id.split('/').pop();
        }
        
        // Remove extension if present
        if (id.includes('.')) {
            id = id.split('.').slice(0, -1).join('.');
        }
        
        // Make it lowercase and replace non-alphanumeric chars with underscores
        id = id.toLowerCase().replace(/[^a-z0-9]/gi, '_');
        
        return id;
    }

    // Function to parse markdown in text
    function parseMarkdown(text) {
        if (!text) return text;
        
        // Parse bold text: **text**
        text = text.replace(/\*\*(.*?)\*\*/g, '<span class="md-bold">$1</span>');
        
        // Parse italic text: *text* (but not if it's already part of a bold tag)
        text = text.replace(/\*([^\*<>]*?)\*/g, function(match, content) {
            // Skip if this is inside a bold tag 
            if (match.indexOf('md-bold') !== -1) return match;
            return '<span class="md-italic">' + content + '</span>';
        });
        
        // Handle bullet points
        text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        
        // Wrap lists in ul tags
        if (text.includes('<li>')) {
            text = '<ul>' + text + '</ul>';
            // Clean up by removing any standalone ul tags
            text = text.replace(/<ul><\/ul>/g, '');
        }
        
        return text;
    }

    // Function to set up the improved math input
    function setupMathInput() {
        // Create a new math input container to replace the standard input
        const frqContainer = elements.frqContainer;
        if (!frqContainer) return;
        
        // Clear existing content
        frqContainer.innerHTML = '';
        
        // Create new math input elements
        const mathInputContainer = document.createElement('div');
        mathInputContainer.className = 'math-input-container';
        
        const mathPreview = document.createElement('div');
        mathPreview.className = 'math-preview';
        mathPreview.id = 'math-preview';
        
        // Use textarea for larger input area and better handling of newlines
        const mathInput = document.createElement('textarea');
        mathInput.className = 'math-input';
        mathInput.id = 'answer-input';
        mathInput.placeholder = 'Your answer...';
        mathInput.autocomplete = 'off'; // Disable autocomplete
        mathInput.spellcheck = false;   // Disable spellcheck
        
        // Add event listeners
        mathInput.addEventListener('input', function() {
            updateMathPreview();
            autoResizeTextarea(this);
        });
        
        mathInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                // Ctrl+Enter to submit
                submitAnswer();
            }
            if (e.key === 'Tab') {
                // Tab key for indentation
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                
                // Add tab at cursor position
                this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
                
                // Move cursor after tab
                this.selectionStart = this.selectionEnd = start + 1;
                
                // Update preview
                updateMathPreview();
                autoResizeTextarea(this);
            }
        });
        
        mathInput.addEventListener('focus', function() {
            mathInputContainer.classList.add('focused');
        });
        
        mathInput.addEventListener('blur', function() {
            mathInputContainer.classList.remove('focused');
        });
        
        // Append elements
        mathInputContainer.appendChild(mathPreview);
        mathInputContainer.appendChild(mathInput);
        frqContainer.appendChild(mathInputContainer);
        
        // Add a note about Ctrl+Enter
        const submitNote = document.createElement('div');
        submitNote.className = 'submit-note';
        submitNote.textContent = 'Press Ctrl+Enter to submit';
        submitNote.style.fontSize = '0.8rem';
        submitNote.style.textAlign = 'right';
        submitNote.style.color = '#999';
        submitNote.style.marginTop = '5px';
        submitNote.style.marginBottom = '10px';
        frqContainer.appendChild(submitNote);
        
        // Update elements object
        elements.answerInput = mathInput;
        elements.mathPreview = mathPreview;
        elements.mathInputContainer = mathInputContainer;
        
        console.log("Math input system set up");
    }
    
    

    // Function to update math preview with Desmos-like formatting
    function updateMathPreview() {
        const input = elements.answerInput.value;
        const preview = elements.mathPreview;
        const container = elements.mathInputContainer;
        
        if (!input || !preview) {
            if (preview) preview.innerHTML = '';
            if (container) container.classList.remove('has-content');
            return;
        }
        
        // Indicate that we have content (used for CSS)
        if (container) container.classList.add('has-content');
        
        // Process the input to create Desmos-like formatting
        let formattedInput = processMathInput(input);
        
        // Set the preview content
        preview.innerHTML = formattedInput;
        
        // Ensure the preview matches the textarea height
        autoResizeTextarea(elements.answerInput);
    }
    
    
    
    

    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the new height (with a minimum of 120px)
        const newHeight = Math.max(120, textarea.scrollHeight);
        
        // Apply the new height
        textarea.style.height = newHeight + 'px';
        
        // Also update the container and preview height
        if (elements.mathPreview && elements.mathInputContainer) {
            elements.mathPreview.style.minHeight = newHeight + 'px';
        }
    }

    // Process math input to create Desmos-like formatting
    function processMathInput(input) {
        // Handle empty input
        if (!input) return '';
        
        // Split input by lines and process each line
        const lines = input.split('\n');
        const processedLines = lines.map(line => {
            // First, check if line contains any math expressions
            if (!/[\/\^\(\)\[\]\{\}sqrt]/.test(line)) {
                return line; // No special formatting needed
            }
            
            // Handle complex fractions like 4/(2+x)
            let result = line.replace(/(\d+|\([^)]+\))\s*\/\s*(\d+|\([^)]+\))/g, function(match, p1, p2) {
                return `<span class="fraction"><span class="numerator">${p1}</span><span class="denominator">${p2}</span></span>`;
            });
            
            // Handle simpler fractions like 1/2
            result = result.replace(/(\d+)\s*\/\s*(\d+)(?!\w)/g, function(match, p1, p2) {
                return `<span class="fraction"><span class="numerator">${p1}</span><span class="denominator">${p2}</span></span>`;
            });
            
            // Handle powers/exponents
            result = result.replace(/(\d+|\w)\^(\d+|\w)/g, function(match, base, exp) {
                return `${base}<span class="power">${exp}</span>`;
            });
            
            // Handle roots/square roots
            result = result.replace(/sqrt\(([^)]+)\)/g, function(match, content) {
                return `√<span class="sqrt-content">${content}</span>`;
            });
            
            // Handle parentheses with different colors
            result = result.replace(/\(/g, '<span class="paren-open">(</span>');
            result = result.replace(/\)/g, '<span class="paren-close">)</span>');
            
            return result;
        });
        
        // Join lines back with line breaks for HTML
        return processedLines.join('<br>');
    }
    // Function to format markdown in explanations
    function formatMarkdown(text) {
        if (!text) return '';
        
        // Format bold with ** or __
        text = text.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<span class="bold">$1$2</span>');
        
        // Format italic with * or _
        text = text.replace(/\*(.*?)\*|_(.*?)_/g, '<span class="italic">$1$2</span>');
        
        // Format headers
        text = text.replace(/^# (.*?)$/gm, '<h2>$1</h2>');
        text = text.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
        text = text.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
        
        // Format lists
        text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
        text = text.replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>');
        
        // Wrap lists in ul or ol
        text = text.replace(/(<li>.*?<\/li>)\n(?!<li>)/gs, '<ul>$1</ul>\n');
        
        // Format code blocks
        text = text.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
        
        // Format inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Format blockquotes
        text = text.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
        
        // Add step-by-step solution class
        text = text.replace(/Step (\d+):(.*?)(?=Step \d+:|$)/gs, '<div class="solution-step"><strong>Step $1:</strong>$2</div>');
        
        // Add key concept class
        text = text.replace(/Key Concept:(.*?)(?=\n\n|$)/gs, '<div class="key-concept"><strong>Key Concept:</strong>$1</div>');
        
        // Replace newlines with <br> for HTML rendering
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    // Function to fetch preset files from the 'presets' folder
    function fetchPresetFiles() {
        // Show loading state
        if (elements.presetsContainer) {
            elements.presetsContainer.innerHTML = '<div class="preset-loading">Loading presets...</div>';
        }
    
        try {
            // Create subject categories
            const subjectCategories = [
                {
                    id: 'chemistry',
                    name: 'Chemistry',
                    icon: '🧪',
                    description: 'AP Chemistry study materials',
                    presets: []
                },
                {
                    id: 'calculus',
                    name: 'Calculus',
                    icon: '📊',
                    description: 'AP Calculus study materials',
                    presets: []
                },
                {
                    id: 'statistics',
                    name: 'Statistics',
                    icon: '📈',
                    description: 'AP Statistics study materials',
                    presets: []
                },

                {
<<<<<<< HEAD
                    id: 'business',
                    name: 'Business',
                    icon: '💸',
                    description: 'IB Business study materials',
                    presets: []
                },

                {
=======
>>>>>>> 90a6b16 (Added IB Business)
                    id: 'economics',
                    name: 'Economics',
                    icon: '💰',
                    description: 'AP Economics study materials',
                    presets: []
                
                },

                {
                    id: 'ib-business',
                    name: 'IB Business',
                    icon: '💼',
                    description: 'IB Business Study materials',
                    presets: []
                }

            ];
    
            // Preset files - assign to appropriate categories
            const chemistryQuiz = {
                name: 'AP Chemistry Unit 17 MCQ Review',
                filename: 'presets/unit17mcqreview.csv',
                description: 'MCQ Review for Test'
            };

            const pHcalculations = {
                name: 'pH Calculation Quiz Review',
                filename: 'presets/pHcalculations.csv',
                description: 'pH Test Prep'
            };
            
            const chemistryUnit17 = {
                name: 'AP Chemistry Unit 17',
                filename: 'presets/apchemistryunit17.csv',
                description: 'HW Problems and More'
            };
    
            const calculusUnit7 = {
                name: 'AP Calculus Unit 7 Test',
                filename: 'presets/apcalcunit7.csv',
                description: 'Word problems'
            };
    
            const calculusUnit6 = {
                name: 'AP Calculus Unit 6 Test',
                filename: 'presets/apcalcunit6.csv',
                description: 'Calc test prep'
            };
    
            const statsUnit89 = {
                name: 'AP Stats Unit 8 & 9 Test',
                filename: 'presets/apstatsunit89.csv',
                description: 'Estimating proportions with confidence & Testing claims about proportions'
            };
    
            const macroUnit3 = {
                name: 'AP Macro Unit 3 Test',
                filename: 'presets/apmacrounit3.csv',
                description: 'MPC and MPS'
            };

            const bizunit4_1 = {
                name: 'IB Business unit 4.1',
                filename : 'presets/ibbusiness4.1.csv',
                description : 'Unit 4.1 MCQ questions'
            }

            const bizunit4_2 = {
                name: 'IB Business unit 4.2',
                filename : 'presets/ibbusiness4.2.csv',
                description : 'Unit 4.2 MCQ questions'
            }

            const bizunit4_3 = {
                name: 'IB Business unit 4.3',
                filename : 'presets/ibbusiness4.3.csv',
                description : 'Unit 4.3 MCQ questions'
            }

            const bizunit4_4 = {
                name: 'IB Business unit 4.4',
                filename : 'presets/ibbusiness4.4.csv',
                description : 'Unit 4.4 MCQ questions'
            }

            const bizunit4_5a = {
                name: 'IB Business unit 4.5 A',
                filename : 'presets/ibbusiness4.5a.csv',
                description : 'Unit 4.5 A MCQ questions'
            }

            const bizunit4_5b = {
                name: 'IB Business unit 4.5 B',
                filename : 'presets/ibbusiness4.5b.csv',
                description : 'Unit 4.5 B MCQ questions'
            }

            const bizunit4_5c = {
                name: 'IB Business unit 4.5 C',
                filename : 'presets/ibbusiness4.5.c.csv',
                description : 'Unit 4.5 C MCQ questions'
            }

            const bizunit4_5d = {
                name: 'IB Business unit 4.5 D',
                filename : 'presets/ibbusiness4.5.d.csv',
                description : 'Unit 4.5 D MCQ questions'
            }

            const bizunit4_5e = {
                name: 'IB Business unit 4.5 E',
                filename : 'presets/ibbusiness4.5.e.csv',
                description : 'Unit 4.5 D MCQ questions'
            }
    
            // Add presets to their respective categories
            const chemistry = subjectCategories.find(cat => cat.id === 'chemistry');
            if (chemistry) {
                chemistry.presets.push(chemistryQuiz);
                chemistry.presets.push(chemistryUnit17);
                chemistry.presets.push(pHcalculations);
            }
    
            const calculus = subjectCategories.find(cat => cat.id === 'calculus');
            if (calculus) {
                calculus.presets.push(calculusUnit7);
                calculus.presets.push(calculusUnit6);
            }
    
            const statistics = subjectCategories.find(cat => cat.id === 'statistics');
            if (statistics) {
                statistics.presets.push(statsUnit89);
            }
    
            const physics = subjectCategories.find(cat => cat.id === 'physics');
            if (physics) {
                physics.presets.push(physicsUnit4);
            }
    
            const economics = subjectCategories.find(cat => cat.id === 'economics');
            if (economics) {
                economics.presets.push(macroUnit3);
            }

            const ib_business = subjectCategories.find(cat => cat.id === 'ib-business' );
            if (ib_business){
                ib_business.presets.push(bizunit4_1)
                ib_business.presets.push(bizunit4_2)
                ib_business.presets.push(bizunit4_3)
                ib_business.presets.push(bizunit4_4)
                ib_business.presets.push(bizunit4_5a)
                ib_business.presets.push(bizunit4_5b)
                ib_business.presets.push(bizunit4_5c)
                ib_business.presets.push(bizunit4_5d)
                ib_business.presets.push(bizunit4_5e)
            }
    
            // Filter out empty categories
            const filteredCategories = subjectCategories.filter(cat => cat.presets.length > 0);
            
            // Store categories in state
            state.subjectCategories = filteredCategories;
            
            // Create a flat list of all presets for compatibility with existing code
            const allPresets = [];
            for (const category of filteredCategories) {
                for (const preset of category.presets) {
                    allPresets.push(preset);
                }
            }
            
            // Store presets in state for backward compatibility
            state.availablePresets = allPresets;
            
            // If we're on the welcome screen, display subject categories instead of the old options
            if (elements.screens.welcome.classList.contains('active')) {
                displaySubjectCategories();
            } else if (elements.screens.presets.classList.contains('active')) {
                // Check if we're viewing a specific category
                if (state.currentSubjectCategory) {
                    displayPresetFilesForCategory(state.currentSubjectCategory);
                } else {
                    displaySubjectCategories();
                }
            }
        } catch (error) {
            console.error("Error organizing preset files:", error);
            if (elements.presetsContainer) {
                elements.presetsContainer.innerHTML = 
                    '<div class="preset-empty">Error loading presets: ' + error.message + '</div>';
            }
        }
    }

    function displaySubjectCategories() {
        // Clear welcome screen content and prepare it for displaying categories
        elements.screens.welcome.innerHTML = '';
        
        // Create container for subject categories
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'subject-categories-container';
        
        // Create header for the categories view
        const header = document.createElement('div');
        header.className = 'subject-categories-header';
        
        const title = document.createElement('h2');
        title.textContent = 'Study Materials';
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Select a subject to browse available study materials';
        
        // Add upload own file option
        const uploadContainer = document.createElement('div');
        uploadContainer.className = 'upload-own-container';
        
        const uploadLabel = document.createElement('p');
        uploadLabel.textContent = 'Or upload your own materials:';
        
        const uploadBtn = document.createElement('label');
        uploadBtn.className = 'upload-btn';
        uploadBtn.textContent = 'Upload CSV File';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'csv-upload';
        fileInput.accept = '.csv';
        fileInput.addEventListener('change', handleCSVUpload);
        
        uploadBtn.appendChild(fileInput);
        uploadContainer.appendChild(uploadLabel);
        uploadContainer.appendChild(uploadBtn);
        
        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Create grid for subject categories
        const categoryGrid = document.createElement('div');
        categoryGrid.className = 'subject-category-grid';
        
        // Create a card for each subject category
        state.subjectCategories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'subject-category-card';
            categoryCard.dataset.categoryId = category.id;
            
            const categoryIcon = document.createElement('div');
            categoryIcon.className = 'subject-category-icon';
            categoryIcon.textContent = category.icon || '📚';
            
            const categoryContent = document.createElement('div');
            categoryContent.className = 'subject-category-content';
            
            const categoryName = document.createElement('h3');
            categoryName.textContent = category.name;
            
            const categoryDesc = document.createElement('p');
            categoryDesc.textContent = category.description;
            
            const presetCount = document.createElement('div');
            presetCount.className = 'preset-count';
            presetCount.textContent = `${category.presets.length} ${category.presets.length === 1 ? 'material' : 'materials'}`;
            
            categoryContent.appendChild(categoryName);
            categoryContent.appendChild(categoryDesc);
            categoryContent.appendChild(presetCount);
            
            categoryCard.appendChild(categoryIcon);
            categoryCard.appendChild(categoryContent);
            
            // Add click event to view presets in this category
            categoryCard.addEventListener('click', () => {
                showPresetsForCategory(category);
            });
            
            categoryGrid.appendChild(categoryCard);
        });
        
        // Assemble the categories view
        categoriesContainer.appendChild(header);
        categoriesContainer.appendChild(categoryGrid);
        categoriesContainer.appendChild(uploadContainer);
        
        // Add to welcome screen
        elements.screens.welcome.appendChild(categoriesContainer);
        
        // Make the welcome screen visible
        showScreen('welcome');
    }
    
    // Function to show presets for a specific category
    function showPresetsForCategory(category) {
        // Store the current category
        state.currentSubjectCategory = category;
        
        // Update the presets container title
        const presetsHeader = elements.screens.presets.querySelector('.screen-header h2');
        if (presetsHeader) {
            presetsHeader.textContent = `${category.name} Materials`;
        }
        
        // Update back button to return to subject categories
        const backBtn = elements.screens.presets.querySelector('#preset-back-btn');
        if (backBtn) {
            // Remove existing event listeners
            const newBackBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBackBtn, backBtn);
            
            // Add new event listener
            newBackBtn.addEventListener('click', () => {
                state.currentSubjectCategory = null;
                displaySubjectCategories();
            });
        }
        
        // Display the presets for this category
        displayPresetFilesForCategory(category);
        
        // Show the presets screen
        showScreen('presets');
    }
    
    // Function to display preset files for a specific category
    function displayPresetFilesForCategory(category) {
        if (!elements.presetsContainer) return;
    
        // Clear container
        elements.presetsContainer.innerHTML = '';
    
        if (category.presets.length === 0) {
            elements.presetsContainer.innerHTML = `<div class="preset-empty">No preset files found in the ${category.name} category.</div>`;
            return;
        }
    
        // Create element for each preset
        category.presets.forEach(preset => {
            const presetElement = document.createElement('div');
            presetElement.className = 'preset-item';
            
            // Extract just the filename without path and extension
            const displayName = preset.name || preset.filename.split('/').pop().replace('.csv', '');
            
            // Use consistent ID generation
            const presetId = generatePresetId(preset.filename);
            
            const presetName = document.createElement('h3');
            presetName.textContent = displayName;
            
            const presetDescription = document.createElement('p');
            presetDescription.textContent = preset.description || `Load questions from ${displayName}`;
            
            // Check if there's saved progress for this preset
            let hasSavedProgress = false;
            if (window.QuickStudyMemory && typeof window.QuickStudyMemory.hasSavedProgress === 'function') {
                hasSavedProgress = window.QuickStudyMemory.hasSavedProgress(presetId);
            }
            
            // Create buttons container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'preset-buttons';
            
            // Add "Continue" button if there's saved progress
            if (hasSavedProgress) {
                const continueButton = document.createElement('button');
                continueButton.textContent = 'Continue';
                continueButton.className = 'preset-continue-btn';
                continueButton.addEventListener('click', () => loadPresetFile(preset.filename, true));
                buttonContainer.appendChild(continueButton);
            }
            
            // Add "Start New" button
            const startButton = document.createElement('button');
            startButton.textContent = hasSavedProgress ? 'Start New' : 'Select';
            startButton.className = 'preset-select-btn';
            startButton.addEventListener('click', () => loadPresetFile(preset.filename, false));
            buttonContainer.appendChild(startButton);
            
            presetElement.appendChild(presetName);
            presetElement.appendChild(presetDescription);
            presetElement.appendChild(buttonContainer);
            
            elements.presetsContainer.appendChild(presetElement);
        });
    }

    // Function to display preset files
    function displayPresetFiles() {
        if (!elements.presetsContainer) return;

        // Clear container
        elements.presetsContainer.innerHTML = '';

        if (state.availablePresets.length === 0) {
            elements.presetsContainer.innerHTML = '<div class="preset-empty">No preset files found in the presets folder.</div>';
            return;
        }

        // Create element for each preset
        state.availablePresets.forEach(preset => {
            const presetElement = document.createElement('div');
            presetElement.className = 'preset-item';
            
            // Extract just the filename without path and extension
            const displayName = preset.name || preset.filename.split('/').pop().replace('.csv', '');
            
            // Use consistent ID generation
            const presetId = generatePresetId(preset.filename);
            
            const presetName = document.createElement('h3');
            presetName.textContent = displayName;
            
            const presetDescription = document.createElement('p');
            presetDescription.textContent = preset.description || `Load questions from ${displayName}`;
            
            // Check if there's saved progress for this preset
            let hasSavedProgress = false;
            if (window.QuickStudyMemory && typeof window.QuickStudyMemory.hasSavedProgress === 'function') {
                hasSavedProgress = window.QuickStudyMemory.hasSavedProgress(presetId);
            }
            
            // Create buttons container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'preset-buttons';
            
            // Add "Continue" button if there's saved progress
            if (hasSavedProgress) {
                const continueButton = document.createElement('button');
                continueButton.textContent = 'Continue';
                continueButton.className = 'preset-continue-btn';
                continueButton.addEventListener('click', () => loadPresetFile(preset.filename, true));
                buttonContainer.appendChild(continueButton);
            }
            
            // Add "Start New" button
            const startButton = document.createElement('button');
            startButton.textContent = hasSavedProgress ? 'Start New' : 'Select';
            startButton.className = 'preset-select-btn';
            startButton.addEventListener('click', () => loadPresetFile(preset.filename, false));
            buttonContainer.appendChild(startButton);
            
            presetElement.appendChild(presetName);
            presetElement.appendChild(presetDescription);
            presetElement.appendChild(buttonContainer);
            
            elements.presetsContainer.appendChild(presetElement);
        });
    }
    // Function to show presets screen
    function showPresetsScreen() {
        showScreen('presets');
        displayPresetFiles();
    }

    // Function to load a preset file
    async function loadPresetFile(filename, continueProgress = false) {
        console.log(`Loading preset file: ${filename}, continue progress: ${continueProgress}`);
        
        // Show loading state
        elements.presetsContainer.innerHTML = '<div class="preset-loading">Loading questions from preset...</div>';
        
        try {
            // Use fetch API to load the CSV file from the server
            const response = await fetch(filename);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvData = await response.text();
            
            // Parse the CSV content
            try {
                const parseResult = parseCSV(csvData);
                state.questions = parseResult.questions;
                state.isMCQ = parseResult.isMCQ;
                
                console.log("Parsed questions:", state.questions);
                console.log("Question type:", state.isMCQ ? "Multiple Choice" : "Free Response");
                
                // Reset state categories
                state.categories = {};
                state.categoryPerformance = {};
                
                // Initialize categories
                initializeCategories();
                
                // Generate a consistent ID for this preset
                const presetId = generatePresetId(filename);
                
                // Try to load saved progress if requested
                if (continueProgress && window.QuickStudyMemory && typeof window.QuickStudyMemory.loadProgress === 'function') {
                    const savedProgress = window.QuickStudyMemory.loadProgress(presetId);
                    
                    if (savedProgress) {
                        // Restore progress from saved data
                        restoreProgress(savedProgress);
                        console.log("Resumed from saved progress:", savedProgress);
                    } else {
                        console.log("No saved progress found, starting new session");
                    }
                } else if (window.QuickStudyMemory && typeof window.QuickStudyMemory.clearProgress === 'function') {
                    // If starting new, clear any existing progress
                    window.QuickStudyMemory.clearProgress(presetId);
                }
                
                // Store the preset ID for later use
                state.currentPresetId = presetId;
                
                startStudySession();
            } catch (error) {
                console.error("Error parsing preset:", error);
                elements.presetsContainer.innerHTML = '<div class="preset-empty">Error loading preset: ' + error.message + '</div>';
            }
        } catch (error) {
            console.error("Error loading preset file:", error);
            elements.presetsContainer.innerHTML = '<div class="preset-empty">Error: Could not load the preset file. ' + error.message + '</div>';
        }
    }

    // Settings functions
    function openSettings() {
        if (elements.settingsModal) {
            elements.settingsModal.style.display = 'block';
        }
    }

    function closeSettings() {
        if (elements.settingsModal) {
            elements.settingsModal.style.display = 'none';
        }
    }

    function toggleDarkMode() {
        state.isDarkMode = elements.darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', state.isDarkMode);
        saveUserPreferences();
    }

    function toggleTimeScoring() {
        state.useTimeScoring = elements.timeScoringToggle.checked;
        saveUserPreferences();
    }
    
    function toggleAdaptiveMastery() {
        state.useAdaptiveMastery = elements.adaptiveMasteryToggle.checked;
        saveUserPreferences();
    }
    
    function updateConsecutiveCorrect() {
        const value = parseInt(elements.consecutiveCorrectInput.value);
        if (value >= 5 && value <= 30) {
            state.requiredCorrectAnswers = value;
        } else if (value < 5) {
            elements.consecutiveCorrectInput.value = 5;
            state.requiredCorrectAnswers = 5;
        } else {
            elements.consecutiveCorrectInput.value = 30;
            state.requiredCorrectAnswers = 30;
        }
        saveUserPreferences();
    }

    // Function to handle CSV file upload
    function handleCSVUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log("CSV file selected:", file.name);
        
        // Reset state categories to ensure only categories from this CSV are considered
        state.categories = {};
        state.categoryPerformance = {};
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const csvData = event.target.result;
                const parseResult = parseCSV(csvData);
                state.questions = parseResult.questions;
                state.isMCQ = parseResult.isMCQ;
                
                console.log("Parsed questions:", state.questions);
                console.log("Question type:", state.isMCQ ? "Multiple Choice" : "Free Response");
                
                if (state.questions.length > 0) {
                    initializeCategories();
                    startStudySession();
                } else {
                    alert('No valid questions found in the CSV file.');
                }
            } catch (error) {
                console.error("CSV parsing error:", error);
                alert('Error parsing CSV file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Function to parse CSV data
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const questions = [];
        let isMCQ = false;
        
        // Check if we have MCQ format by examining header row
        if (lines.length > 0) {
            const headerFields = lines[0].toLowerCase().split(',');
            
            // MCQ format detection - look for an options column
            isMCQ = headerFields.includes('options');
        }
        
        // Skip header row if it exists
        const startIdx = lines[0].toLowerCase().includes('question') ? 1 : 0;
        
        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Split by comma, but handle potential quotes
            const parts = parseCSVLine(line);
            
            if (isMCQ) {
                // Parse MCQ format: Question,Answer,Options,Category,Time,Difficulty
                if (parts.length >= 3) {
                    const question = formatMathEquation(parts[0].trim());
                    const correctAnswer = parts[1].trim();
                    const optionsString = parts[2].trim();
                    
                    // Split options by semicolon
                    const optionParts = optionsString.split(';').map(opt => opt.trim());
                    
                    // Get category, time and difficulty if available
                    const category = parts.length > 3 ? parts[3].trim() : 'general';
                    const time = parts.length > 4 ? parseInt(parts[4]) || DEFAULT_TIME : DEFAULT_TIME;
                    const difficulty = parts.length > 5 ? parts[5].trim().toLowerCase() : 'medium';
                    
                    questions.push({
                        question,
                        answer: correctAnswer,
                        options: optionParts,
                        category,
                        time,
                        difficulty
                    });
                }
            } else {
                // Parse FRQ format: Question,Answer,Category,Time,Difficulty
                if (parts.length >= 2) {
                    const question = formatMathEquation(parts[0].trim());
                    const answer = parts[1].trim();
                    const category = parts.length > 2 ? parts[2].trim() : 'general';
                    const time = parts.length > 3 ? parseInt(parts[3]) || DEFAULT_TIME : DEFAULT_TIME;
                    const difficulty = parts.length > 4 ? parts[4].trim().toLowerCase() : 'medium';
                    
                    questions.push({
                        question,
                        answer,
                        category,
                        time,
                        difficulty
                    });
                }
            }
        }
        
        return { questions, isMCQ };
    }
    
    // Helper function to parse a CSV line and handle quoted fields
    function parseCSVLine(line) {
        // This is a simplified CSV parser that handles basic quoted fields
        const result = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                // Toggle quote state
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(currentField);
                currentField = '';
            } else {
                // Add character to current field
                currentField += char;
            }
        }
        
        // Add the last field
        result.push(currentField);
        
        return result;
    }

    // Function to format math equations for display (improved)
    function formatMathEquation(text) {
        // First, process any LaTeX that might be in the text
        if (text.includes('\\') || text.includes('frac')) {
            return text; // Already has LaTeX formatting
        }
        
        // Check if this contains math expressions
        if (/(\d+)\/(\d+)|\^|sqrt|\(|\)/.test(text)) {
            // Replace fractions
            let formatted = text.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');
            
            // Replace exponents
            formatted = formatted.replace(/(\d+|\w)\^(\d+|\w)/g, '$1^{$2}');
            
            // Replace sqrt
            formatted = formatted.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
            
            // Wrap in KaTeX delimiters if not already wrapped
            if (!formatted.includes('\\(')) {
                formatted = `\\(${formatted}\\)`;
            }
            
            return formatted;
        }
        
        // If not a math expression, return the original text
        return text;
    }

    // Function to shuffle an array (for MCQ options)
    function shuffleArray(array) {
        const newArray = [...array]; // Create a copy to avoid modifying the original
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // Function to initialize categories from questions
    function initializeCategories() {
        // Extract unique categories
        const categories = [...new Set(state.questions.map(q => q.category))];
        
        // Initialize category data structures
        categories.forEach(category => {
            // Initialize category tracking
            state.categories[category] = {
                questions: state.questions.filter(q => q.category === category),
                correct: 0,
                incorrect: 0,
                times: [],
                totalTime: 0,
                mastery: 0,
                isMastered: false
            };
            
            // Initialize category performance tracking for adaptive mastery
            state.categoryPerformance[category] = {
                consecutiveCorrect: 0,
                timeWithinLimit: 0,  // Count of answers within time limit
                totalAttempts: 0,
                recentResults: [], // Store last N results (true/false for correct/incorrect)
                recentTimeResults: [], // Store last N time results (true/false for within limit)
                masteryScore: 0 // Overall mastery score from 0-100
            };
        });
    }

    // Function to restore progress from saved data
    function restoreProgress(savedProgress) {
        if (!savedProgress) return;
        
        // Restore basic stats
        state.currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
        state.correctAnswers = savedProgress.correctAnswers || 0;
        state.incorrectAnswers = savedProgress.incorrectAnswers || 0;
        state.totalTime = savedProgress.totalTime || 0;
        state.questionTimes = savedProgress.questionTimes || [];
        
        // Restore category stats
        if (savedProgress.categories) {
            Object.keys(savedProgress.categories).forEach(category => {
                if (state.categories[category]) {
                    state.categories[category].correct = savedProgress.categories[category].correct || 0;
                    state.categories[category].incorrect = savedProgress.categories[category].incorrect || 0;
                    state.categories[category].times = savedProgress.categories[category].times || [];
                    state.categories[category].totalTime = savedProgress.categories[category].totalTime || 0;
                    state.categories[category].mastery = savedProgress.categories[category].mastery || 0;
                    state.categories[category].isMastered = savedProgress.categories[category].isMastered || false;
                }
            });
        }
        
        // Restore category performance data
        if (savedProgress.categoryPerformance) {
            Object.keys(savedProgress.categoryPerformance).forEach(category => {
                if (state.categoryPerformance[category]) {
                    state.categoryPerformance[category].consecutiveCorrect = 
                        savedProgress.categoryPerformance[category].consecutiveCorrect || 0;
                    state.categoryPerformance[category].timeWithinLimit = 
                        savedProgress.categoryPerformance[category].timeWithinLimit || 0;
                    state.categoryPerformance[category].totalAttempts = 
                        savedProgress.categoryPerformance[category].totalAttempts || 0;
                    state.categoryPerformance[category].recentResults = 
                        savedProgress.categoryPerformance[category].recentResults || [];
                    state.categoryPerformance[category].recentTimeResults = 
                        savedProgress.categoryPerformance[category].recentTimeResults || [];
                    state.categoryPerformance[category].masteryScore = 
                        savedProgress.categoryPerformance[category].masteryScore || 0;
                }
            });
        }
    }
    
    // Function to start the study session
    function startStudySession() {
        console.log("Starting study session with questions:", state.questions);

        // Initialize category filtering state
        state.originalQuestions = [...state.questions];
        state.selectedCategories = [];
        state.allCategoriesSelected = true;
        state.studyStarted = false;
        state.answeredQuestions = [];
        
        // If we're not continuing from saved progress (currentQuestionIndex is 0), reset state
        if (state.currentQuestionIndex === 0) {
            // Reset state
            state.correctAnswers = 0;
            state.incorrectAnswers = 0;
            state.totalTime = 0;
            state.questionTimes = [];
            state.mastery = 0;
            state.selectedMCQOption = null;
            
            // Reset category stats
            Object.keys(state.categories).forEach(category => {
                state.categories[category].correct = 0;
                state.categories[category].incorrect = 0;
                state.categories[category].times = [];
                state.categories[category].totalTime = 0;
                state.categories[category].mastery = 0;
                state.categories[category].isMastered = false;
                
                // Reset category performance tracking
                state.categoryPerformance[category] = {
                    consecutiveCorrect: 0,
                    timeWithinLimit: 0,
                    totalAttempts: 0,
                    recentResults: [],
                    recentTimeResults: [],
                    masteryScore: 0
                };
            });
        }
        
        // Initialize category mastery overview
        updateCategoryMasteryOverview();
        
        // Update UI
        updateStats();
        showScreen('study');
        loadQuestion();
    }

    state.currentSubjectCategory = null;

// Fetch presets with the new subject-based organization
    fetchPresetFiles();

    // Function to highlight a specific category in the mastery overview
function highlightCategoryInMasteryOverview(categoryToHighlight) {
    // First, remove any existing highlights
    const categoryItems = document.querySelectorAll('.category-mastery-item');
    categoryItems.forEach(item => {
        item.classList.remove('highlighted');
    });
    
    // Find the category item and highlight it
    categoryItems.forEach(item => {
        const nameElement = item.querySelector('.category-mastery-name');
        if (nameElement && nameElement.textContent.toLowerCase() === categoryToHighlight.replace(/_/g, ' ').toLowerCase()) {
            item.classList.add('highlighted');
            
            // Add a pulsing animation to draw attention
            item.classList.add('pulse-animation');
            
            // Remove the animation class after it completes
            setTimeout(() => {
                item.classList.remove('pulse-animation');
            }, 2000);
        }
    });
}
    // Function to get the next non-mastered question
    function getNextQuestion() {
        // If using adaptive mastery, skip mastered categories
        if (state.useAdaptiveMastery) {
            // Start from the current index
            for (let i = state.currentQuestionIndex; i < state.questions.length; i++) {
                const question = state.questions[i];
                // Skip if the category is mastered
                if (!state.categories[question.category].isMastered) {
                    return i;
                }
            }
            
            // If all remaining questions are from mastered categories, just continue with the next question
            return state.currentQuestionIndex;
        }
        
        // If not using adaptive mastery, just return the next question index
        return state.currentQuestionIndex;
    }

    // Function to load the current question - IMPROVED FOR MATH DISPLAY
    function loadQuestion() {

            // Check if no categories are selected
        if (!state.allCategoriesSelected && state.selectedCategories.length === 0) {
            // Show message in question display
            if (elements.questionDisplay) {
                elements.questionDisplay.innerHTML = '<div class="no-question-message">Please select at least one category to continue.</div>';
            }
            
            // Hide input areas
            if (elements.frqContainer) elements.frqContainer.style.display = 'none';
            if (elements.mcqContainer) elements.mcqContainer.style.display = 'none';
            
            // Disable submit button
            if (elements.submitAnswer) {
                elements.submitAnswer.disabled = true;
            }
            
            // Update UI elements
            elements.categoryDisplay.textContent = 'Category: None selected';
            elements.difficultyDisplay.textContent = 'Difficulty: N/A';
            elements.targetTime.textContent = 'Target: N/A';
            
            // Hide mastery badge
            elements.mastery.classList.add('hidden');
            
            return;
        }
        // Get the next unmastered question index
        const nextIndex = getNextQuestion();
        
        // Update current index
        state.currentQuestionIndex = nextIndex;
        
        if (state.currentQuestionIndex >= state.questions.length) {
            showResults();
            return;
        }
        
        const currentQuestion = state.questions[state.currentQuestionIndex];
        console.log("Loading question:", currentQuestion);
        
        if (!currentQuestion) {
            console.error("No question found at index:", state.currentQuestionIndex);
            alert("Error: No question found. Please restart the app.");
            return;
        }
        
        // Store the current question for explanation
        currentExplanationState.question = currentQuestion.question;
        currentExplanationState.correctAnswer = currentQuestion.answer;
        
        // Check if the category is mastered
        const category = currentQuestion.category;
        const isCategoryMastered = state.categories[category].isMastered;
        
        // Show or hide mastery badge
        elements.mastery.classList.toggle('hidden', !isCategoryMastered);
        
        // Display the question with improved variable formatting
        if (window.QuickStudyAI && typeof window.QuickStudyAI.formatQuestionText === 'function') {
            // Show placeholder while loading
            elements.questionDisplay.textContent = "Loading question...";
            
            // Use Gemini to format the question
            window.QuickStudyAI.formatQuestionText(
                currentQuestion.question,
                function(formattedQuestion) {
                    // Apply markdown formatting first
                    formattedQuestion = parseMarkdown(formattedQuestion);
                    
                    // Display the formatted question
                    elements.questionDisplay.innerHTML = formattedQuestion;
                    
                    // Render math with KaTeX or MathJax
                    if (window.katex && window.renderMathInElement) {
                        renderMathInElement(elements.questionDisplay, {
                            delimiters: [
                                {left: "\\(", right: "\\)", display: false},
                                {left: "\\[", right: "\\]", display: true},
                                {left: "$", right: "$", display: false}
                            ]
                        });
                    } else if (window.MathJax) {
                        window.MathJax.typeset([elements.questionDisplay]);
                    }
                }
            );
        } else {
            // Fallback to regular question display
            const formattedQuestion = parseMarkdown(currentQuestion.question);
            elements.questionDisplay.innerHTML = formattedQuestion;
            
            // Render math with KaTeX or MathJax
            if (window.katex && window.renderMathInElement) {
                renderMathInElement(elements.questionDisplay, {
                    delimiters: [
                        {left: "\\(", right: "\\)", display: false},
                        {left: "\\[", right: "\\]", display: true}
                    ]
                });
            } else if (window.MathJax) {
                window.MathJax.typeset([elements.questionDisplay]);
            }
        }
        
        // Reset answer input and preview
        if (elements.answerInput) {
            elements.answerInput.value = '';
        }
        
        if (elements.mathPreview) {
            elements.mathPreview.innerHTML = '';
        }
        
        // Set up for MCQ or FRQ
        if (state.isMCQ) {
            // Show MCQ container, hide FRQ container
            elements.frqContainer.classList.add('hidden');
            elements.mcqContainer.classList.remove('hidden');
            
            // Clear selected option
            state.selectedMCQOption = null;
            
            // Generate MCQ options with improved math rendering
            let options = currentQuestion.options;
            if (Array.isArray(options) && !options.includes(currentQuestion.answer)) {
                options.push(currentQuestion.answer);
            }
            generateMCQOptions(options, currentQuestion.answer);
        } else {
            // Show FRQ container, hide MCQ container
            elements.frqContainer.classList.remove('hidden');
            elements.mcqContainer.classList.add('hidden');
            
            // Make sure we're using the enhanced math input
            if (elements.answerInput) {
                elements.answerInput.focus();
            }
        }
        
        // Show category, difficulty, and target time
        const difficulty = currentQuestion.difficulty || 'medium';
        const targetTime = currentQuestion.time || DEFAULT_TIME;
        
        // Make category display into a clickable button
elements.categoryDisplay.innerHTML = `<span class="category-button">Category: ${category.replace(/_/g, ' ')}</span>`;
elements.categoryDisplay.classList.add('clickable');
elements.categoryDisplay.onclick = function() {
    // Scroll to the category mastery section
    document.querySelector('.mastery-overview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Highlight the specific category in the mastery overview
    highlightCategoryInMasteryOverview(category);
    
    // Log to debug
    console.log("Category clicked:", category);
    console.log("Scrolling to:", document.querySelector('.mastery-overview'));
};
        elements.difficultyDisplay.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
        elements.targetTime.textContent = `Target: ${targetTime}s`;
        
        // Update mastery progress for this category
        updateMasteryDisplay(category);
        
        // Update progress
        const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
        elements.progressFill.style.width = `${progress}%`;
        elements.questionCounter.textContent = `Question ${state.currentQuestionIndex + 1}/${state.questions.length}`;
        
        // Reset explanation state for new question
        hideExplanation();
        
        // Reset and start timer
        elapsedTime = 0;
        state.questionStartTime = Date.now();
        startTimer();
    }
    
    // Function to generate MCQ options - IMPROVED FOR MATH RENDERING
    function generateMCQOptions(options, correctAnswer) {
        // Clear previous options
        elements.mcqOptions.innerHTML = '';
        
        // Make sure options is an array
        let optionsArray = Array.isArray(options) ? options : 
                         (typeof options === 'string' ? options.split(';') : []);
        
        // Shuffle options
        const shuffledOptions = shuffleArray(optionsArray);
        
        // Create option elements
        shuffledOptions.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'mcq-option';
            optionElement.dataset.value = option;
            
            // If option contains math expressions, use the equation class for styling
            if (/(\d+)\/(\d+)|\^|sqrt|\(|\)/.test(option)) {
                const formattedOption = processMathInput(option);
                optionElement.innerHTML = `<span class="equation">${formattedOption}</span>`;
            } else {
                optionElement.textContent = option;
            }
            
            // Add click event to select this option
            optionElement.addEventListener('click', function() {
                // Remove selected class from all options
                document.querySelectorAll('.mcq-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to this option
                optionElement.classList.add('selected');
                
                // Store selected option
                state.selectedMCQOption = option;
            });
            
            elements.mcqOptions.appendChild(optionElement);
        });
    }
    
    // Function to update mastery display
    function updateMasteryDisplay(category) {
        if (!state.categories[category]) return;
        
        const catData = state.categories[category];
        const performanceData = state.categoryPerformance[category];
        
        // Calculate a mastery percentage based on performance
        let masteryPercentage = 0;
        
        if (performanceData.totalAttempts > 0) {
            masteryPercentage = performanceData.masteryScore;
        } else {
            masteryPercentage = catData.mastery;
        }
        
        // Update mastery percentage display
        elements.masteryLevel.textContent = `Mastery: ${Math.round(masteryPercentage)}%`;
        
        // Update mastery progress bar
        elements.masteryProgressFill.style.width = `${Math.round(masteryPercentage)}%`;
    }
    
    // Function to update category mastery overview
    // Updated updateCategoryMasteryOverview 
    
function updateCategoryMasteryOverview() {
    // Clear the container
    elements.categoryMasteryOverview.innerHTML = '';
    
    // Check if no categories are selected
    if (!state.allCategoriesSelected && state.selectedCategories.length === 0) {
        // Add message for no categories selected
        const noSelectionMessage = document.createElement('div');
        noSelectionMessage.className = 'no-categories-selected';
        noSelectionMessage.innerHTML = '<p>No categories are selected, please select a category.</p>';
        elements.categoryMasteryOverview.appendChild(noSelectionMessage);
        
        // Disable submit button if no categories are selected
        if (elements.submitAnswer) {
            elements.submitAnswer.disabled = true;
        }
    } else {
        // Enable submit button if categories are selected
        if (elements.submitAnswer) {
            elements.submitAnswer.disabled = false;
        }
    }
    
    // Add "Select All" / "Unselect All" button
    const selectAllButton = document.createElement('div');
    selectAllButton.className = 'category-mastery-item select-all-item' + 
                             (state.allCategoriesSelected ? ' selected' : '');
    
    // Set the appropriate text based on selection state
    const buttonText = state.allCategoriesSelected ? 'Unselect All' : 'Select All';
    selectAllButton.innerHTML = `<div class="category-mastery-name">${buttonText}</div>`;
    
    // Add event listener to Select All button
    selectAllButton.addEventListener('click', function() {
        toggleAllCategories();
    });
    
    elements.categoryMasteryOverview.appendChild(selectAllButton);
    
    // Create an item for each category
    Object.keys(state.categories).forEach(category => {
        const catData = state.categories[category];
        const performanceData = state.categoryPerformance[category];
        
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-mastery-item';
        
        // Add selected class if this category is selected
        if (state.selectedCategories.includes(category) || state.allCategoriesSelected) {
            categoryItem.classList.add('selected');
        }
        
        // Make the category item clickable to toggle selection
        categoryItem.dataset.category = category;
        categoryItem.addEventListener('click', function() {
            toggleCategorySelection(category);
        });
        
        const categoryName = document.createElement('div');
        categoryName.className = 'category-mastery-name';
        categoryName.textContent = category.replace(/_/g, ' ');
        
        const masteryBar = document.createElement('div');
        masteryBar.className = 'category-mastery-bar';
        
        const masteryFill = document.createElement('div');
        masteryFill.className = 'category-mastery-fill';
        if (catData.isMastered) {
            masteryFill.classList.add('mastered');
        }
        
        // Use the mastery score from performance data if available
        const masteryPercentage = performanceData.totalAttempts > 0 ? 
            performanceData.masteryScore : catData.mastery;
            
        masteryFill.style.width = `${Math.round(masteryPercentage)}%`;
        
        const masteryValue = document.createElement('div');
        masteryValue.className = 'category-mastery-value';
        masteryValue.textContent = `${Math.round(masteryPercentage)}%`;
        
        // Add consecutive correct counter if applicable
        if (performanceData.consecutiveCorrect > 0) {
            masteryValue.textContent += ` (${performanceData.consecutiveCorrect}/${state.requiredCorrectAnswers})`;
        }
        
        // Add question count indicator
        const questionCount = catData.questions.length;
        const countElement = document.createElement('div');
        countElement.className = 'category-question-count';
        countElement.textContent = `${questionCount} questions`;
        
        // Add mastery badge if mastered
        if (catData.isMastered) {
            const badge = document.createElement('div');
            badge.className = 'category-badge';
            badge.textContent = '✓';
            categoryItem.appendChild(badge);
        }
        
        masteryBar.appendChild(masteryFill);
        
        categoryItem.appendChild(categoryName);
        categoryItem.appendChild(countElement);
        categoryItem.appendChild(masteryBar);
        categoryItem.appendChild(masteryValue);
        
        elements.categoryMasteryOverview.appendChild(categoryItem);
    });
    
    // Update the question counter to reflect the filtered questions
    updateQuestionCounter();
}


    // Step 3: Add function to toggle category selection
    function toggleCategorySelection(category) {
        // If all categories were selected, we need to initialize the selectedCategories array
        if (state.allCategoriesSelected) {
            state.allCategoriesSelected = false;
            // Select all categories except the one being toggled
            state.selectedCategories = Object.keys(state.categories).filter(cat => cat !== category);
        }
        // Toggle the selected state of the category
        else if (state.selectedCategories.includes(category)) {
            // Deselecting: remove from array
            state.selectedCategories = state.selectedCategories.filter(cat => cat !== category);
        } else {
            // Selecting: add to array
            state.selectedCategories.push(category);
            
            // If all categories are now selected, set allCategoriesSelected flag
            if (state.selectedCategories.length === Object.keys(state.categories).length) {
                state.allCategoriesSelected = true;
            }
        }
        
        // Filter and rebuild the question queue without auto-submitting
        rebuildQuestionQueue();
        
        // Update the category mastery overview to show selection status
        updateCategoryMasteryOverview();
    }
    

// Step 4: Function to select or deselect all categories
function toggleAllCategories() {
    // Toggle the all categories selected flag
    state.allCategoriesSelected = !state.allCategoriesSelected;
    
    // If turning on all categories, clear selected categories array
    if (state.allCategoriesSelected) {
        state.selectedCategories = [];
    }
    // If turning off all categories, selectedCategories remains empty
    else {
        state.selectedCategories = [];
    }
    
    // Rebuild the question queue
    rebuildQuestionQueue();
    
    // Update the UI
    updateCategoryMasteryOverview();
}

// Step 5: Function to rebuild the question queue based on selected categories
function rebuildQuestionQueue() {
    // If we have an original set of questions, use that as reference
    if (state.originalQuestions.length === 0) {
        state.originalQuestions = [...state.questions];
    }

    // Store the current question and index
    const currentIndex = state.currentQuestionIndex;
    const currentQuestion = currentIndex < state.questions.length ? 
                           state.questions[currentIndex] : null;
    
    // Track if we were already in progress
    const wasInProgress = state.studyStarted;
    
    // If the study hasn't started yet, we can simply filter the questions
    if (!state.studyStarted) {
        // Filter questions based on selected categories
        if (state.allCategoriesSelected) {
            // Use all original questions
            state.questions = [...state.originalQuestions];
        } else if (state.selectedCategories.length > 0) {
            // Filter to only include selected categories
            state.questions = state.originalQuestions.filter(question => 
                state.selectedCategories.includes(question.category)
            );
        } else {
            // No categories selected, empty the queue
            state.questions = [];
        }
        
        // Update the current index to 0
        state.currentQuestionIndex = 0;
    } else {
        // Study has started, we need to maintain the current queue
        
        // Get all questions that have been answered so far
        const answeredIndexes = state.questions.slice(0, currentIndex);
        
        // Find questions that haven't been answered yet from selected categories
        let futureQuestions = [];
        
        // Only find future questions if categories are selected
        if (state.allCategoriesSelected || state.selectedCategories.length > 0) {
            futureQuestions = state.originalQuestions.filter(q => {
                // Check if this question has already been answered
                const alreadyAnswered = answeredIndexes.some(answered => 
                    answered.question === q.question && answered.answer === q.answer
                );
                
                // Include if not answered and from selected categories
                return !alreadyAnswered && (state.allCategoriesSelected || 
                       state.selectedCategories.includes(q.category));
            });
            
            // Sort future questions using adaptive mastery
            futureQuestions = sortQuestionsByAdaptiveMastery(futureQuestions);
        }
        
        // Combine answered questions with future questions
        state.questions = [...answeredIndexes, ...futureQuestions];
        
        // Maintain the current question index
        state.currentQuestionIndex = currentIndex;
    }
    
    // Update question counter display
    updateQuestionCounter();
    
    // Only reload the question if we're on the study screen and there are questions available
    if (elements.screens.study.classList.contains('active')) {
        // Check if we have no categories selected
        if (!state.allCategoriesSelected && state.selectedCategories.length === 0) {
            // Show no-categories message and disable submit button
            if (elements.submitAnswer) {
                elements.submitAnswer.disabled = true;
            }
            
            // Display message in question display area
            if (elements.questionDisplay) {
                elements.questionDisplay.innerHTML = '<div class="no-question-message">Please select at least one category to continue.</div>';
            }
            
            // Hide input/MCQ containers
            if (elements.frqContainer) elements.frqContainer.style.display = 'none';
            if (elements.mcqContainer) elements.mcqContainer.style.display = 'none';
        } else {
            // Re-enable inputs
            if (elements.frqContainer) elements.frqContainer.style.display = '';
            if (elements.mcqContainer) elements.mcqContainer.style.display = state.isMCQ ? '' : 'none';
            
            // Re-enable submit button
            if (elements.submitAnswer) {
                elements.submitAnswer.disabled = false;
            }
            
            // Load the question
            loadQuestion();
        }
    }
}


// New function to sort questions using adaptive mastery
function sortQuestionsByAdaptiveMastery(questions) {
    // Sort questions to prioritize categories with lower mastery scores
    return questions.sort((a, b) => {
        // Get category data
        const catA = state.categories[a.category];
        const catB = state.categories[b.category];
        
        // Get performance data
        const perfA = state.categoryPerformance[a.category];
        const perfB = state.categoryPerformance[b.category];
        
        // Calculate mastery scores
        const masteryA = perfA.totalAttempts > 0 ? perfA.masteryScore : catA.mastery;
        const masteryB = perfB.totalAttempts > 0 ? perfB.masteryScore : catB.mastery;
        
        // Sort by mastery (ascending - lower mastery first)
        if (masteryA !== masteryB) {
            return masteryA - masteryB;
        }
        
        // If mastery is the same, sort by difficulty
        const difficultyMap = { 'easy': 1, 'medium': 2, 'hard': 3 };
        const diffA = difficultyMap[a.difficulty] || 2;
        const diffB = difficultyMap[b.difficulty] || 2;
        
        return diffB - diffA; // Higher difficulty first
    });
}



// Step 6: Function to update the question counter
function updateQuestionCounter() {
    if (elements.questionCounter && state.questions.length > 0) {
        elements.questionCounter.textContent = `Question ${state.currentQuestionIndex + 1}/${state.questions.length}`;
    } else if (elements.questionCounter) {
        elements.questionCounter.textContent = 'No questions selected';
    }
    
    // Update progress bar
    if (elements.progressFill) {
        const progress = state.questions.length > 0 ? 
                        ((state.currentQuestionIndex + 1) / state.questions.length) * 100 : 0;
        elements.progressFill.style.width = `${progress}%`;
    }
}


    // Function to save current progress to localStorage
    function saveCurrentProgress() {
        // Check if we have a preset ID and the memory API is available
        if (state.currentPresetId && window.QuickStudyMemory && typeof window.QuickStudyMemory.saveProgress === 'function') {
            window.QuickStudyMemory.saveProgress(state, state.currentPresetId);
        }
    }

    // Function to start the timer
    function startTimer() {
        clearInterval(timerInterval);
        elapsedTime = 0;
        
        elements.timer.textContent = '00:00';
        
        timerInterval = setInterval(() => {
            elapsedTime++;
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            elements.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
        
        console.log("Timer started");
    }

    // Function to stop the timer
    function stopTimer() {
        clearInterval(timerInterval);
        const questionEndTime = Date.now();
        const timeTaken = (questionEndTime - state.questionStartTime) / 1000; // in seconds
        state.questionTimes.push(timeTaken);
        state.totalTime += timeTaken;
        
        console.log("Timer stopped. Time taken:", timeTaken);
        return timeTaken;
    }

    // Function to calculate time score
    function calculateTimeScore(timeTaken, targetTime) {
        // If time scoring is disabled, return 100
        if (!state.useTimeScoring) {
            return 100;
        }
        
        // If under target time, score is 100%
        if (timeTaken <= targetTime) {
            return 100;
        }
        
        // Calculate how much over target time they were
        const overTargetRatio = timeTaken / targetTime;
        
        // If over 2x target time, score is 0
        if (overTargetRatio >= 2) {
            return 0;
        }
        
        // Otherwise, linear scale from 100% at target to 0% at 2x target
        return Math.max(0, 100 - ((overTargetRatio - 1) * 100));
    }

    // Function to submit answer - UPDATED FOR EXPLANATION FEATURE
    function submitAnswer() {
        // If we're already processing an answer, don't allow another submission
        if (state.isProcessingAnswer) {
            return;
        }
        
        console.log("Submit answer clicked");
        
        const timeTaken = stopTimer();
        const currentQuestion = state.questions[state.currentQuestionIndex];
        
        if (!currentQuestion) {
            console.error("No current question found during submit");
            return;
        }
        
        console.log("Current question:", currentQuestion);
        
        const category = currentQuestion.category;
        const difficulty = currentQuestion.difficulty || 'medium';
        const targetTime = currentQuestion.time || DEFAULT_TIME;
        const timeScore = calculateTimeScore(timeTaken, targetTime);
        
        // Get user answer (either from text input or MCQ selection)
        let userAnswer;
        
        if (state.isMCQ) {
            userAnswer = state.selectedMCQOption;
            // If no option was selected, alert user and return
            if (!userAnswer) {
                alert("Please select an answer before submitting.");
                // Restart timer
                startTimer();
                return;
            }
            
            console.log("MCQ answer selected:", userAnswer);
            console.log("Correct answer:", currentQuestion.answer);
            
            // Store for explanation
            currentExplanationState.userAnswer = userAnswer;
            
            // MCQ is always exact match
            const isCorrect = userAnswer === currentQuestion.answer;
            currentExplanationState.wasCorrect = isCorrect;
            
            processAnswerResult(isCorrect, timeTaken, targetTime, timeScore);
        } else {
            userAnswer = elements.answerInput.value.trim();
            console.log("FRQ answer entered:", userAnswer);
            console.log("Correct answer:", currentQuestion.answer);
            
            // Store for explanation
            currentExplanationState.userAnswer = userAnswer;
            
            // Update UI to show we're processing
            elements.submitAnswer.textContent = "Evaluating...";
            elements.submitAnswer.disabled = true;
            state.isProcessingAnswer = true;
            
            console.log("Checking if QuickStudyAI is available");
            console.log("window.QuickStudyAI exists:", !!window.QuickStudyAI);
            
            // Use AI to evaluate the FRQ answer
            if (window.QuickStudyAI && typeof window.QuickStudyAI.compareAnswers === 'function') {
                // Add spinner or loading indicator to submit button
                elements.submitAnswer.innerHTML = '<span class="processing-indicator"></span> Evaluating...';
                
                // Clean the question text for sending to the API (remove KaTeX formatting)
                const cleanQuestion = currentQuestion.question.replace(/\\[\(\)]/g, '').replace(/\\frac{(\d+)}{(\d+)}/g, '$1/$2').replace(/(\d+)\^{(\d+)}/g, '$1^$2');
                
                try {
                    window.QuickStudyAI.compareAnswers(
                        userAnswer, 
                        currentQuestion.answer,
                        cleanQuestion,
                        function(isCorrect) {
                            console.log("Answer evaluation result:", isCorrect);
                            
                            // Store for explanation
                            currentExplanationState.wasCorrect = isCorrect;
                            
                            // Reset UI
                            elements.submitAnswer.textContent = "Submit";
                            elements.submitAnswer.disabled = false;
                            state.isProcessingAnswer = false;
                            
                            // Process the result
                            processAnswerResult(isCorrect, timeTaken, targetTime, timeScore);
                        }
                    );
                } catch (error) {
                    console.error("Error calling QuickStudyAI.compareAnswers:", error);
                    // Reset UI
                    elements.submitAnswer.textContent = "Submit";
                    elements.submitAnswer.disabled = false;
                    state.isProcessingAnswer = false;
                    
                    // Fall back to exact match
                    console.log("Falling back to exact match due to error");
                    const isExactMatch = userAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
                    
                    // Store for explanation
                    currentExplanationState.wasCorrect = isExactMatch;
                    
                    processAnswerResult(isExactMatch, timeTaken, targetTime, timeScore);
                }
            } else {
                console.warn("AI comparison not available, using exact match");
                
                elements.submitAnswer.textContent = "Submit";
                elements.submitAnswer.disabled = false;
                state.isProcessingAnswer = false;
                
                // Fall back to exact match
                const isExactMatch = userAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
                
                // Store for explanation
                currentExplanationState.wasCorrect = isExactMatch;
                
                console.log("Exact match comparison result:", isExactMatch);
                processAnswerResult(isExactMatch, timeTaken, targetTime, timeScore);
            }
        }
    }
    
    // Function to show explanation
    function showExplanation() {
        // Original code that shows the explanation container
        elements.explanationContainer.classList.remove('hidden');
        
        // Show loading state
        elements.explanationLoading.style.display = 'block';
        elements.explanationContent.innerHTML = '';
        
        // Disable the button while loading
        elements.seeExplanation.disabled = true;
        elements.seeExplanation.textContent = 'Loading...';
        
        console.log("Showing explanation for:", currentExplanationState);
        
        // Check if QuickStudyAI is available
        if (window.QuickStudyAI && typeof window.QuickStudyAI.getExplanation === 'function') {
            // Get explanation from Gemini API
            window.QuickStudyAI.getExplanation(
                currentExplanationState.userAnswer,
                currentExplanationState.correctAnswer,
                currentExplanationState.question,
                currentExplanationState.wasCorrect,
                function(explanation) {
                    // Hide loading state
                    elements.explanationLoading.style.display = 'none';
                    
                    // Format markdown in the explanation
                    const formattedExplanation = formatMarkdown(explanation);
                    
                    // Display the explanation
                    elements.explanationContent.innerHTML = formattedExplanation;
                    
                    // Re-enable the button
                    elements.seeExplanation.disabled = false;
                    elements.seeExplanation.textContent = 'Update Explanation';
                    
                    // Render any math in the explanation
                    if (window.katex && window.renderMathInElement) {
                        renderMathInElement(elements.explanationContent, {
                            delimiters: [
                                {left: "\\(", right: "\\)", display: false},
                                {left: "\\[", right: "\\]", display: true},
                                {left: "$", right: "$", display: false}
                            ]
                        });
                    } else if (window.MathJax) {
                        window.MathJax.typeset([elements.explanationContent]);
                    }
                    
                    // Add the chat UI after the explanation is displayed
                    // Check if chat UI already exists and remove it if it does
                    const existingChat = elements.explanationContent.querySelector('.explanation-chat-container');
                    if (existingChat) {
                        existingChat.remove();
                    }
                    
                    // Create the chat UI
                    if (window.QuickStudyAI && typeof window.QuickStudyAI.createChatUI === 'function') {
                        // Make formatMarkdown function available to QuickStudyAI
                        window.formatMarkdown = formatMarkdown;
                        
                        // Create the chat UI
                        const chatUI = window.QuickStudyAI.createChatUI(
                            elements.explanationContent, 
                            function(question, responseCallback) {
                                // Handle the question by passing it to the AI
                                if (window.QuickStudyAI && typeof window.QuickStudyAI.handleFollowUpQuestion === 'function') {
                                    window.QuickStudyAI.handleFollowUpQuestion(question, function(response) {
                                        // Pass the response back to the chat UI
                                        responseCallback(response);
                                        
                                        // Render math in the response (if needed)
                                        setTimeout(function() {
                                            const aiMessages = elements.explanationContent.querySelectorAll('.ai-message');
                                            const lastMessage = aiMessages[aiMessages.length - 1];
                                            
                                            if (window.katex && window.renderMathInElement && lastMessage) {
                                                renderMathInElement(lastMessage, {
                                                    delimiters: [
                                                        {left: "\\(", right: "\\)", display: false},
                                                        {left: "\\[", right: "\\]", display: true},
                                                        {left: "$", right: "$", display: false}
                                                    ]
                                                });
                                            } else if (window.MathJax && lastMessage) {
                                                window.MathJax.typeset([lastMessage]);
                                            }
                                        }, 100);
                                    });
                                } else {
                                    responseCallback("I'm sorry, the follow-up question feature isn't available right now. Please try refreshing the page.");
                                }
                                
                                // After sending a question, make sure the textarea auto-resizes back to appropriate size
                                setTimeout(function() {
                                    const chatTextarea = document.querySelector('.explanation-chat-input');
                                    if (chatTextarea) {
                                        chatTextarea.style.height = 'auto';
                                        chatTextarea.style.height = (chatTextarea.scrollHeight + 2) + 'px';
                                    }
                                }, 50);
                            }
                        );
                    }
                }
            );
        } else {
            // Fallback if Gemini API is not available (original fallback code)
            const explanation = getDefaultExplanation(
                currentExplanationState.userAnswer,
                currentExplanationState.correctAnswer,
                currentExplanationState.question,
                currentExplanationState.wasCorrect
            );
            
            // Hide loading state
            elements.explanationLoading.style.display = 'none';
            
            // Display the explanation
            elements.explanationContent.innerHTML = explanation;
            
            // Re-enable the button
            elements.seeExplanation.disabled = false;
            elements.seeExplanation.textContent = 'See Explanation';
        }
    }

    // Function to hide explanation
    function hideExplanation() {
        elements.explanationContainer.classList.add('hidden');
        elements.explanationContent.innerHTML = '';
        elements.explanationLoading.style.display = 'block';
        elements.seeExplanation.disabled = false;
        elements.seeExplanation.textContent = 'See Explanation';
    }

    // Default explanation generator
    function getDefaultExplanation(userAnswer, expectedAnswer, question, wasCorrect) {
        if (wasCorrect) {
            return `
<h2>Great job!</h2>

<p>Your answer "${userAnswer}" is correct. The expected answer was "${expectedAnswer}".</p>

<div class="solution-step"><strong>Step 1:</strong> Understand the problem and identify the appropriate approach.</div>
<div class="solution-step"><strong>Step 2:</strong> Apply the correct formula or method.</div>
<div class="solution-step"><strong>Step 3:</strong> Calculate the result carefully.</div>

<div class="key-concept"><strong>Key Concept:</strong>
This question tests your understanding of the specific concept being asked about. 
Continue practicing similar problems to strengthen your understanding.</div>
`;
        } else {
            return `
<h2>Let's review this</h2>

<p>Your answer was "${userAnswer}", but the correct answer is "${expectedAnswer}".</p>

<div class="solution-step"><strong>Step 1:</strong> Understand what the question is asking.</div>
<div class="solution-step"><strong>Step 2:</strong> Identify the correct approach or formula.</div>
<div class="solution-step"><strong>Step 3:</strong> Work through the solution methodically.</div>
<div class="solution-step"><strong>Step 4:</strong> Check your work for errors.</div>

<div class="key-concept"><strong>Key Concept:</strong>
This question tests your understanding of the specific concept being asked about.
Make sure to review this topic in your notes or textbook.</div>
`;
        }
    }
    
    // Process the answer result (after AI evaluation if applicable)
    function processAnswerResult(isCorrect, timeTaken, targetTime, timeScore) {

        state.studyStarted = true;
        const currentQuestion = state.questions[state.currentQuestionIndex];
        const category = currentQuestion.category;
        const isWithinTimeLimit = timeTaken <= targetTime;
        
        console.log("Answer evaluated:", isCorrect ? "Correct" : "Incorrect", 
                    "Time:", timeTaken, "Target:", targetTime, 
                    "Within limit:", isWithinTimeLimit, "Score:", timeScore);
        
        // Update category stats and performance trackers
        updateCategoryPerformance(category, isCorrect, isWithinTimeLimit, timeTaken, targetTime, timeScore);
        
        // Update global stats
        if (isCorrect) {
            state.correctAnswers++;
            state.categories[category].correct++;
            elements.answerFeedback.textContent = 'Correct! Great job!';
            elements.answerFeedback.className = 'correct';
            console.log(`Correct answers: ${state.correctAnswers}, Category ${category} correct: ${state.categories[category].correct}`);
        } else {
            state.incorrectAnswers++;
            state.categories[category].incorrect++;
            
            // Improved incorrect answer formatting using Gemini
            if (window.QuickStudyAI && typeof window.QuickStudyAI.formatCorrectAnswer === 'function') {
                // Show placeholder while loading
                elements.answerFeedback.textContent = 'Incorrect. Loading formatted answer...';
                elements.answerFeedback.className = 'incorrect';
                
                // Use Gemini to format the correct answer
                window.QuickStudyAI.formatCorrectAnswer(
                    currentQuestion.answer,
                    currentQuestion.question,
                    function(formattedAnswer) {
                        // Create a better formatted incorrect message
                        const incorrectElement = document.createElement('div');
                        
                        // Add header
                        const header = document.createElement('div');
                        header.innerHTML = '<span class="md-bold">Incorrect</span>';
                        header.style.marginBottom = '8px';
                        incorrectElement.appendChild(header);
                        
                        // Add "The correct answer is:" text
                        const introText = document.createElement('div');
                        introText.innerHTML = '<span class="md-bold">The correct answer is:</span>';
                        introText.style.marginBottom = '8px';
                        incorrectElement.appendChild(introText);
                        
                        // Apply markdown formatting to the answer
                        formattedAnswer = parseMarkdown(formattedAnswer);
                        
                        // Add the formatted answer in a styled container
                        const answerContainer = document.createElement('div');
                        answerContainer.className = 'formatted-answer';
                        answerContainer.innerHTML = formattedAnswer;
                        answerContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        answerContainer.style.padding = '8px 12px';
                        answerContainer.style.borderRadius = '4px';
                        answerContainer.style.border = '1px solid #ddd';
                        incorrectElement.appendChild(answerContainer);
                        
                        // Update the feedback element
                        elements.answerFeedback.innerHTML = '';
                        elements.answerFeedback.appendChild(incorrectElement);
                        elements.answerFeedback.className = 'incorrect';
                        
                        // Render math in the formatted answer
                        if (window.katex && window.renderMathInElement) {
                            renderMathInElement(answerContainer, {
                                delimiters: [
                                    {left: "\\(", right: "\\)", display: false},
                                    {left: "\\[", right: "\\]", display: true},
                                    {left: "$", right: "$", display: false}
                                ]
                            });
                        } else if (window.MathJax) {
                            window.MathJax.typeset([answerContainer]);
                        }
                    }
                );
            } else {
                // Fallback to regular incorrect message
                elements.answerFeedback.textContent = `Incorrect. The correct answer is: ${currentQuestion.answer}`;
                elements.answerFeedback.className = 'incorrect';
            }
            
            console.log(`Incorrect answers: ${state.incorrectAnswers}, Category ${category} incorrect: ${state.categories[category].incorrect}`);
        }
        
        // Update category stats
        state.categories[category].times.push(timeTaken);
        state.categories[category].totalTime += timeTaken;
        
        // Calculate mastery and check if the category is mastered
        const wasMastered = state.categories[category].isMastered;
        
        // Check if the category is now mastered based on performance
        checkCategoryMastery(category);
        
        const isNowMastered = state.categories[category].isMastered;
        
        // Show time feedback
        elements.timeFeedback.textContent = `You answered in ${timeTaken.toFixed(1)} seconds (Target: ${targetTime}s)`;
        
        // Show time score feedback
        elements.timeScoreFeedback.textContent = `Time Score: ${Math.round(timeScore)}%`;
        if (timeScore >= 80) {
            elements.timeScoreFeedback.className = 'good';
        } else if (timeScore >= 50) {
            elements.timeScoreFeedback.className = 'average';
        } else {
            elements.timeScoreFeedback.className = 'poor';
        }
        
        // Show mastery feedback if newly mastered
        if (!wasMastered && isNowMastered) {
            elements.masteryFeedback.classList.remove('hidden');
        } else {
            elements.masteryFeedback.classList.add('hidden');
        }
        
        // Reset explanation container
        hideExplanation();
        
        // Update stats
        updateStats();
        
        // Update category mastery overview
        updateCategoryMasteryOverview();
        
        // Show feedback screen
        showScreen('feedback');
        // At the end of processAnswerResult(), add this line:
        saveCurrentProgress();
    }
    
    // Add showEndOfSessionOptions function
function showEndOfSessionOptions() {
    const endDialog = document.createElement('div');
    endDialog.className = 'end-session-dialog';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'end-session-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Practice Session Complete';
    
    const message = document.createElement('p');
    message.textContent = 'You have completed all questions in this session. What would you like to do next?';
    
    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = 'Analyze Performance';
    analyzeBtn.className = 'analyze-btn';
    analyzeBtn.addEventListener('click', function() {
        document.body.removeChild(endDialog);
        showResults();
    });
    
    const selectNewBtn = document.createElement('button');
    selectNewBtn.textContent = 'Select New Categories';
    selectNewBtn.className = 'new-categories-btn';
    selectNewBtn.addEventListener('click', function() {
        document.body.removeChild(endDialog);
        
        // Reset selection state
        state.allCategoriesSelected = false;
        state.selectedCategories = [];
        
        // Show study screen with category selection
        showScreen('study');
        
        // Reset the question queue
        rebuildQuestionQueue();
        
        // Update UI
        updateCategoryMasteryOverview();
    });
    
    // Append elements
    dialogContent.appendChild(title);
    dialogContent.appendChild(message);
    dialogContent.appendChild(analyzeBtn);
    dialogContent.appendChild(selectNewBtn);
    endDialog.appendChild(dialogContent);
    
    // Add to body
    document.body.appendChild(endDialog);
}



    // Function to update category performance data
    function updateCategoryPerformance(category, isCorrect, isWithinTimeLimit, timeTaken, targetTime, timeScore) {
        // Get the performance data for this category
        const performanceData = state.categoryPerformance[category];
        
        // Increment total attempts
        performanceData.totalAttempts++;
        
        // Update consecutive correct count and time within limit
        if (isCorrect) {
            if (isWithinTimeLimit) {
                // Both correct and within time limit
                performanceData.consecutiveCorrect++;
                performanceData.timeWithinLimit++;
            } else {
                // Correct but not within time limit - reset consecutive count
                performanceData.consecutiveCorrect = 0;
            }
        } else {
            // Incorrect answer - reset consecutive count
            performanceData.consecutiveCorrect = 0;
        }
        
        // Update recent results (correct/incorrect)
        performanceData.recentResults.push(isCorrect);
        if (performanceData.recentResults.length > 10) {
            performanceData.recentResults.shift();
        }
        
        // Update recent time results (within limit/not within limit)
        performanceData.recentTimeResults.push(isWithinTimeLimit);
        if (performanceData.recentTimeResults.length > 10) {
            performanceData.recentTimeResults.shift();
        }
        
        // Calculate current mastery score (0-100)
        if (performanceData.recentResults.length > 0) {
            // Accuracy component (0-100)
            const accuracyScore = performanceData.recentResults.filter(res => res).length / 
                                performanceData.recentResults.length * 100;
            
            // Time component (0-100)
            const timeScore = performanceData.recentTimeResults.filter(res => res).length / 
                            performanceData.recentTimeResults.length * 100;
            
            // Combine scores with weights
            const masteryScore = (accuracyScore * 0.7) + (timeScore * 0.3);
            
            // Apply bonus for consecutive correct answers
            const consecBonus = Math.min(20, performanceData.consecutiveCorrect * 2);
            
            // Update mastery score
            performanceData.masteryScore = Math.min(100, masteryScore + consecBonus);
            
            console.log(`Category ${category} performance update:`, {
                accuracyScore: accuracyScore.toFixed(1),
                timeScore: timeScore.toFixed(1),
                consecutiveCorrect: performanceData.consecutiveCorrect,
                consecBonus: consecBonus,
                masteryScore: performanceData.masteryScore.toFixed(1)
            });
        }
    }
    
    // Function to check if a category is mastered
    function checkCategoryMastery(category) {
        // Check if this category exists
        if (!state.categories[category]) return false;
        
        // Get category data
        const catData = state.categories[category];
        const performanceData = state.categoryPerformance[category];
        
        // Already mastered
        if (catData.isMastered) return true;
        
        if (state.useAdaptiveMastery) {
            // FIX: Ensure we strictly require the specified number of consecutive correct answers
            // AND that they are all within the time limit
            
            // 1. Check if we have the required number of consecutive correct answers
            const hasEnoughConsecutiveCorrect = performanceData.consecutiveCorrect >= state.requiredCorrectAnswers;
            
            // Only grant mastery if we have enough consecutive correct answers
            if (hasEnoughConsecutiveCorrect) {
                catData.isMastered = true;
                catData.mastery = 100;
                performanceData.masteryScore = 100;
                console.log(`Category ${category} has been mastered! Consecutive correct: ${performanceData.consecutiveCorrect}`);
                return true;
            }
            
            // Not mastered yet
            return false;
        } else {
            // Traditional mastery: based solely on overall stats
            const categoryTotal = catData.correct + catData.incorrect;
            
            if (categoryTotal > 0) {
                // Calculate accuracy
                const accuracy = (catData.correct / categoryTotal) * 100;
                
                // Calculate average time
                const avgTime = catData.totalTime / categoryTotal;
                
                // Get the average target time for this category's questions
                const categoryQuestions = state.questions.filter(q => q.category === category);
                const avgTargetTime = categoryQuestions.reduce((sum, q) => sum + (q.time || DEFAULT_TIME), 0) / 
                                     categoryQuestions.length;
                
                // Check if traditional mastery criteria are met
                catData.mastery = accuracy; // Use accuracy as mastery for traditional approach
                catData.isMastered = 
                    accuracy >= state.masteryThresholds.minAccuracy && 
                    avgTime <= avgTargetTime * state.masteryThresholds.maxTimeOverTarget;
                
                return catData.isMastered;
            }
            
            return false;
        }
    }

    // Function to update statistics
    function updateStats() {
        elements.correctCount.textContent = state.correctAnswers;
        elements.incorrectCount.textContent = state.incorrectAnswers;
        
        const totalAnswered = state.correctAnswers + state.incorrectAnswers;
        if (totalAnswered > 0) {
            const avgTime = state.totalTime / totalAnswered;
            elements.avgTime.textContent = `${avgTime.toFixed(1)}s`;
            
            // Calculate overall mastery (average of category masteries)
            let totalMastery = 0;
            let categoryCount = 0;
            
            Object.keys(state.categories).forEach(category => {
                const catData = state.categories[category];
                const performanceData = state.categoryPerformance[category];
                
                // Use the mastery score from performance data if available
                if (performanceData.totalAttempts > 0) {
                    totalMastery += performanceData.masteryScore;
                    categoryCount++;
                    
                    // Log performance data
                    console.log(`Category ${category} stats:`, {
                        correct: catData.correct,
                        incorrect: catData.incorrect,
                        consecutiveCorrect: performanceData.consecutiveCorrect,
                        masteryScore: performanceData.masteryScore.toFixed(1) + "%",
                        isMastered: catData.isMastered
                    });
                }
            });
            
            // Overall mastery is the average of category masteries
            if (categoryCount > 0) {
                state.mastery = totalMastery / categoryCount;
                elements.masteryLevel.textContent = `Mastery: ${Math.round(state.mastery)}%`;
                elements.masteryProgressFill.style.width = `${Math.round(state.mastery)}%`;
            }
        }
    }

    // Function to show the next question or results
    function showNextQuestion() {
        state.currentQuestionIndex++;
        console.log("Moving to next question:", state.currentQuestionIndex);
        
        // Save progress
        saveCurrentProgress();
        
        if (state.currentQuestionIndex < state.questions.length) {
            showScreen('study');
            loadQuestion();
        } else {
            // End of questions - Show options
            showEndOfSessionOptions();
        }
    }
    
    // Function to show final results
    function showResults() {
        console.log("Showing final results");
        const totalAnswered = state.correctAnswers + state.incorrectAnswers;
        
        if (totalAnswered === 0) {
            console.error("No questions answered");
            alert("Error: No questions answered. Please restart the app.");
            return;
        }
        
        const accuracy = (state.correctAnswers / totalAnswered) * 100;
        const avgTime = state.totalTime / totalAnswered;
        
        elements.finalAccuracy.textContent = `${Math.round(accuracy)}%`;
        elements.finalAvgTime.textContent = `${avgTime.toFixed(1)}s`;
        
        // Show overall mastery
        elements.finalMastery.textContent = `${Math.round(state.mastery)}%`;
        
        // Show category results
        elements.categoryResults.innerHTML = '';
        
        Object.keys(state.categories).forEach(category => {
            const catData = state.categories[category];
            const performanceData = state.categoryPerformance[category];
            const categoryTotal = catData.correct + catData.incorrect;
            
            if (categoryTotal > 0) {
                const accuracy = (catData.correct / categoryTotal) * 100;
                const avgTime = catData.totalTime / categoryTotal;
                
                // Get the average target time for this category's questions
                const categoryQuestions = state.questions.filter(q => q.category === category);
                const avgTargetTime = categoryQuestions.reduce((sum, q) => sum + (q.time || DEFAULT_TIME), 0) / 
                                     categoryQuestions.length;
                
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-result';
                if (catData.isMastered) {
                    categoryDiv.classList.add('mastered');
                }
                
                const categoryName = document.createElement('h4');
                categoryName.textContent = category.replace(/_/g, ' ');
                
                const categoryStats = document.createElement('div');
                
                // Show additional stats for performance-based mastery
                let masteryDetails = '';
                if (performanceData.consecutiveCorrect > 0) {
                    masteryDetails = ` | Streak: ${performanceData.consecutiveCorrect}/${state.requiredCorrectAnswers}`;
                }
                
                categoryStats.innerHTML = `
                    <p>Questions: ${categoryTotal} | Accuracy: ${Math.round(accuracy)}% | Avg. Time: ${avgTime.toFixed(1)}s (Target: ${avgTargetTime.toFixed(1)}s)${masteryDetails}</p>
                    <p>Mastery: ${catData.isMastered ? '100' : Math.round(performanceData.masteryScore)}%</p>
                `;
                
                // Mastery bar
                const masteryBar = document.createElement('div');
                masteryBar.className = 'category-mastery-bar';
                
                const masteryFill = document.createElement('div');
                masteryFill.className = 'category-mastery-fill';
                
                // Use appropriate mastery percentage
                const masteryPercentage = catData.isMastered ? 100 : Math.round(performanceData.masteryScore);
                masteryFill.style.width = `${masteryPercentage}%`;
                
                // Color based on mastery status
                masteryFill.style.backgroundColor = catData.isMastered ? 
                    'var(--mastery-color)' : 
                    (masteryPercentage >= 85 ? 'var(--success-color)' : 'var(--danger-color)');
                
                masteryBar.appendChild(masteryFill);
                
                categoryDiv.appendChild(categoryName);
                categoryDiv.appendChild(categoryStats);
                categoryDiv.appendChild(masteryBar);
                
                elements.categoryResults.appendChild(categoryDiv);
            }
        });
        
        // Generate overall feedback
        const categoriesMastered = Object.values(state.categories).filter(cat => 
            (cat.correct + cat.incorrect > 0) && cat.isMastered
        ).length;
        
        const totalCategories = Object.values(state.categories).filter(cat => 
            (cat.correct + cat.incorrect > 0)
        ).length;
        
        if (categoriesMastered === totalCategories && totalCategories > 0) {
            elements.finalMasteryFeedback.textContent = 'Congratulations! You have mastered all categories and are ready for your test. You can confidently expect an A!';
            elements.finalMasteryFeedback.className = 'mastery-feedback mastered';
        } else {
            let feedbackText = `You've mastered ${categoriesMastered} out of ${totalCategories} categories. `;
            
            // Add specific feedback for categories that need improvement
            const needsImprovement = [];
            
            Object.keys(state.categories).forEach(category => {
                const catData = state.categories[category];
                const performanceData = state.categoryPerformance[category];
                const categoryTotal = catData.correct + catData.incorrect;
                
                if (categoryTotal > 0 && !catData.isMastered) {
                    // Check if accuracy or time is the main issue
                    const accuracy = (catData.correct / categoryTotal) * 100;
                    const avgTime = catData.totalTime / categoryTotal;
                    
                    // Get the average target time for this category
                    const categoryQuestions = state.questions.filter(q => q.category === category);
                    const avgTargetTime = categoryQuestions.reduce((sum, q) => sum + (q.time || DEFAULT_TIME), 0) / 
                                        categoryQuestions.length;
                    
                    let reason = '';
                    if (accuracy < state.masteryThresholds.minAccuracy) {
                        reason += 'accuracy';
                    }
                    
                    if (avgTime > avgTargetTime * state.masteryThresholds.maxTimeOverTarget) {
                        reason += reason ? ' and speed' : 'speed';
                    }
                    
                    needsImprovement.push(`"${category.replace(/_/g, ' ')}" (${reason})`);
                }
            });
            
            if (needsImprovement.length > 0) {
                feedbackText += `Focus on improving: ${needsImprovement.join(', ')}.`;
            }
            
            elements.finalMasteryFeedback.textContent = feedbackText;
            elements.finalMasteryFeedback.className = 'mastery-feedback not-mastered';
        }
        
        showScreen('results');
    }

    // Function to restart the app
    function restartApp() {
        console.log("Restarting app");
        showScreen('welcome');
        elements.csvUpload.value = '';
    }

    // Function to show a specific screen and hide others
    function showScreen(screenName) {
        console.log("Showing screen:", screenName);
        Object.keys(elements.screens).forEach(key => {
            elements.screens[key].classList.remove('active');
        });
        elements.screens[screenName].classList.add('active');
    }

    // Function to navigate to home screen
    function navigateHome() {
        console.log("Header clicked: Navigating to home screen");
        
        // If we're in the middle of a study session, confirm first
        if (elements.screens.study.classList.contains('active') || 
            elements.screens.feedback.classList.contains('active')) {
            
            if (confirm("Are you sure you want to return to the home screen? Your current progress will be saved.")) {
                // Save current progress if in the middle of a session
                if (state.currentPresetId) {
                    saveCurrentProgress();
                }
                
                // Return to welcome screen
                showScreen('welcome');
                elements.csvUpload.value = '';
            }
        } else {
            // Just return to welcome screen if not in a study session
            showScreen('welcome');
            elements.csvUpload.value = '';
        }
    }
    
    // KaTeX helper function
    function renderMathInElement(element, options) {
        if (window.renderMathInElement) {
            window.renderMathInElement(element, options);
        }
    }
});