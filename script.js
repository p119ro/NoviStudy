// Main application logic
document.addEventListener('DOMContentLoaded', function() {
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
        // Settings
        isDarkMode: false,
        useTimeScoring: true,
        useAdaptiveMastery: true,
        requiredCorrectAnswers: 10
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
        formattedAnswerPreview: document.getElementById('formatted-answer-preview'),
        answerInput: document.getElementById('answer-input'),
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
    elements.csvUpload.addEventListener('change', handleCSVUpload);
    elements.usePresetBtn.addEventListener('click', showPresetsScreen);
    elements.presetBackBtn.addEventListener('click', () => showScreen('welcome'));
    
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
    elements.submitAnswer.addEventListener('click', submitAnswer);
    elements.nextQuestion.addEventListener('click', showNextQuestion);
    elements.restartBtn.addEventListener('click', restartApp);
    
    // Keyboard input events
    elements.answerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });

    // Settings Event Listeners - Fix for settings button
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

    // Initialize presets
    fetchPresetFiles();

    // Function to fetch preset files
    function fetchPresetFiles() {
        // This would typically be a server request to get available files
        // For this example, we'll simulate with a timeout

        // Show loading state
        if (elements.presetsContainer) {
            elements.presetsContainer.innerHTML = '<div class="preset-loading">Loading presets...</div>';
        }

        setTimeout(() => {
            // Simulated response with preset files
            // In a real implementation, this would come from a server endpoint
            const presetFiles = [
                { name: 'Math Basics', filename: 'math_basics.csv', description: 'Addition, subtraction, multiplication and division' },
                { name: 'Algebra Fundamentals', filename: 'algebra.csv', description: 'Equations, variables and expressions' },
                { name: 'Science Quiz', filename: 'science.csv', description: 'Biology, chemistry and physics concepts' },
                { name: 'Geography Capitals', filename: 'capitals.csv', description: 'Countries and their capital cities' },
                { name: 'History Facts', filename: 'history.csv', description: 'Major historical events and dates' }
            ];

            // Store presets in state
            state.availablePresets = presetFiles;

            // If we're on the presets screen, display them
            if (elements.screens.presets.classList.contains('active')) {
                displayPresetFiles();
            }
        }, 500);
    }

    // Function to display preset files
    function displayPresetFiles() {
        if (!elements.presetsContainer) return;

        // Clear container
        elements.presetsContainer.innerHTML = '';

        if (state.availablePresets.length === 0) {
            elements.presetsContainer.innerHTML = '<div class="preset-empty">No preset files found.</div>';
            return;
        }

        // Create element for each preset
        state.availablePresets.forEach(preset => {
            const presetElement = document.createElement('div');
            presetElement.className = 'preset-item';
            
            const presetName = document.createElement('h3');
            presetName.textContent = preset.name;
            
            const presetDescription = document.createElement('p');
            presetDescription.textContent = preset.description;
            
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.className = 'preset-select-btn';
            selectButton.addEventListener('click', () => loadPresetFile(preset.filename));
            
            presetElement.appendChild(presetName);
            presetElement.appendChild(presetDescription);
            presetElement.appendChild(selectButton);
            
            elements.presetsContainer.appendChild(presetElement);
        });
    }

    // Function to show presets screen
    function showPresetsScreen() {
        showScreen('presets');
        displayPresetFiles();
    }

    // Function to load a preset file
    function loadPresetFile(filename) {
        console.log(`Loading preset file: ${filename}`);
        
        // Show loading state
        elements.presetsContainer.innerHTML = '<div class="preset-loading">Loading questions from preset...</div>';
        
        // This would typically be a server request to get the file content
        // For this example, we'll simulate with a timeout and sample data based on the filename
        
        setTimeout(() => {
            // Simulated CSV content based on filename
            let csvContent = '';
            
            // Generate appropriate sample content based on filename
            if (filename.includes('math')) {
                csvContent = "Question,Answer,Category,Time,Difficulty\n";
                csvContent += "What is 5 + 3?,8,basic_addition,5,easy\n";
                csvContent += "What is 7 - 4?,3,basic_subtraction,5,easy\n";
                csvContent += "What is 9 × 6?,54,multiplication,8,medium\n";
                csvContent += "What is 20 ÷ 4?,5,division,8,medium\n";
                csvContent += "What is 2^3?,8,exponents,7,medium\n";
                csvContent += "What is 1/2 + 1/4?,3/4,fractions,10,medium\n";
            } else if (filename.includes('algebra')) {
                csvContent = "Question,Answer,Category,Time,Difficulty\n";
                csvContent += "Solve: 2x + 3 = 7,2,linear_equations,12,medium\n";
                csvContent += "Solve: 3x - 5 = 10,5,linear_equations,12,medium\n";
                csvContent += "Factor: x^2 + 5x + 6,(x+2)(x+3),factoring,15,hard\n";
                csvContent += "Evaluate: 3x when x = 4,12,evaluation,8,easy\n";
            } else if (filename.includes('capitals')) {
                csvContent = "Question,Answer,Options,Category,Time,Difficulty\n";
                csvContent += "What is the capital of France?,Paris,London;Berlin;Madrid;Paris,geography,8,easy\n";
                csvContent += "What is the capital of Japan?,Tokyo,Beijing;Seoul;Tokyo;Shanghai,geography,8,easy\n";
                csvContent += "What is the capital of Australia?,Canberra,Sydney;Melbourne;Canberra;Perth,geography,10,hard\n";
                csvContent += "What is the capital of Brazil?,Brasília,Rio de Janeiro;São Paulo;Brasília;Buenos Aires,geography,10,medium\n";
            } else if (filename.includes('science')) {
                csvContent = "Question,Answer,Options,Category,Time,Difficulty\n";
                csvContent += "What is the chemical symbol for gold?,Au,Ag;Au;Fe;Gd,science,6,medium\n";
                csvContent += "Which planet is closest to the sun?,Mercury,Venus;Mercury;Earth;Mars,science,7,easy\n";
                csvContent += "What is the largest mammal on Earth?,Blue Whale,Elephant;Blue Whale;Giraffe;Polar Bear,science,6,medium\n";
                csvContent += "Which element has the atomic number 1?,Hydrogen,Helium;Carbon;Oxygen;Hydrogen,science,8,hard\n";
            } else if (filename.includes('history')) {
                csvContent = "Question,Answer,Options,Category,Time,Difficulty\n";
                csvContent += "In which year did World War II end?,1945,1939;1943;1945;1950,history,7,medium\n";
                csvContent += "Who was the first president of the United States?,George Washington,Thomas Jefferson;George Washington;Abraham Lincoln;John Adams,history,8,easy\n";
                csvContent += "When was the Declaration of Independence signed?,1776,1776;1787;1789;1800,history,7,easy\n";
                csvContent += "What year did the Berlin Wall fall?,1989,1979;1985;1989;1991,history,9,medium\n";
            } else {
                // Generic fallback content
                csvContent = "Question,Answer,Category,Time,Difficulty\n";
                csvContent += "Sample Question 1,Answer 1,general,10,medium\n";
                csvContent += "Sample Question 2,Answer 2,general,10,medium\n";
                csvContent += "Sample Question 3,Answer 3,general,10,medium\n";
            }
            
            // Parse the CSV content
            try {
                const parseResult = parseCSV(csvContent);
                state.questions = parseResult.questions;
                state.isMCQ = parseResult.isMCQ;
                
                // Reset state categories
                state.categories = {};
                state.categoryPerformance = {};
                
                // Initialize categories and start
                initializeCategories();
                startStudySession();
            } catch (error) {
                console.error("Error parsing preset:", error);
                elements.presetsContainer.innerHTML = '<div class="preset-empty">Error loading preset: ' + error.message + '</div>';
            }
            
        }, 800);
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
    }

    function toggleTimeScoring() {
        state.useTimeScoring = elements.timeScoringToggle.checked;
    }
    
    function toggleAdaptiveMastery() {
        state.useAdaptiveMastery = elements.adaptiveMasteryToggle.checked;
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
    }

    // Function to update real-time formatted preview
    function updateFormattedPreview() {
        const input = elements.answerInput.value;
        
        // Only process if there's input
        if (!input) {
            elements.formattedAnswerPreview.innerHTML = '';
            elements.answerInput.classList.remove('format-active');
            return;
        }
        
        // Create a pattern to match only fractions and exponents
        const fractionPattern = /(\d+)\/(\d+)/g;
        const exponentPattern = /(\d+)\^(\d+)/g;
        
        // Check if we have any patterns to format
        const hasFractions = fractionPattern.test(input);
        // Reset regex lastIndex
        fractionPattern.lastIndex = 0;
        
        const hasExponents = exponentPattern.test(input);
        // Reset regex lastIndex
        exponentPattern.lastIndex = 0;
        
        if (!hasFractions && !hasExponents) {
            // No math expressions to format, clear preview
            elements.formattedAnswerPreview.innerHTML = '';
            elements.answerInput.classList.remove('format-active');
            return;
        }
        
        // We have math expressions to format
        elements.answerInput.classList.add('format-active');
        
        // Start with a copy of the input
        let result = input;
        
        // Create a temporary span to hold the content
        const tempSpan = document.createElement('span');
        tempSpan.textContent = result;
        
        // Replace fractions
        if (hasFractions) {
            result = result.replace(fractionPattern, function(match, p1, p2) {
                return `<span class="formatted-math" data-original="${match}">${p1}/${p2}</span>`;
            });
        }
        
        // Replace exponents
        if (hasExponents) {
            result = result.replace(exponentPattern, function(match, p1, p2) {
                return `<span class="formatted-math" data-original="${match}">${p1}<sup>${p2}</sup></span>`;
            });
        }
        
        // Set the formatted HTML
        elements.formattedAnswerPreview.innerHTML = result;
        
        // Create a mapping of original character positions to formatted positions
        const origToFormattedMap = new Map();
        let formattedIndex = 0;
        
        // Make a styled version that hides the original text behind formatting
        const style = document.createElement('style');
        style.id = 'math-format-style';
        
        // Remove any existing style
        const existingStyle = document.getElementById('math-format-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Get all formatted spans
        const formattedSpans = elements.formattedAnswerPreview.querySelectorAll('.formatted-math');
        
        if (formattedSpans.length > 0) {
            // Create style to hide input text where formatted math appears
            let styleText = '';
            formattedSpans.forEach(span => {
                const orig = span.getAttribute('data-original');
                const startPos = input.indexOf(orig);
                if (startPos >= 0) {
                    styleText += `
                        #answer-input.format-active::placeholder {
                            color: transparent;
                        }
                    `;
                }
            });
            
            if (styleText) {
                style.textContent = styleText;
                document.head.appendChild(style);
            }
        }
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

    // Function to format math equations for display
    function formatMathEquation(text) {
        // Check if this is a math expression that needs formatting
        if (/(\d+)\/(\d+)/.test(text) || /(\d+)\^(\d+)/.test(text)) {
            // Replace fractions with proper KaTeX notation
            let formatted = text.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
            
            // Replace exponents with proper KaTeX notation
            formatted = formatted.replace(/(\d+)\^(\d+)/g, '$1^{$2}');
            
            // Wrap in KaTeX delimiters
            return `\\(${formatted}\\)`;
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
    
    // Function to filter questions based on difficulty weights
    function filterQuestionsByDifficulty(questions) {
        // Create a copy of questions to avoid modifying the original
        const allQuestions = [...questions];
        
        // Group questions by difficulty
        const easyQuestions = allQuestions.filter(q => q.difficulty === 'easy');
        const mediumQuestions = allQuestions.filter(q => q.difficulty === 'medium');
        const hardQuestions = allQuestions.filter(q => q.difficulty === 'hard');
        
        // Calculate how many questions to take from each difficulty
        const totalQuestions = allQuestions.length;
        const easyCount = Math.round(totalQuestions * 0.5); // 50%
        const mediumCount = Math.round(totalQuestions * 0.3); // 30%
        const hardCount = Math.round(totalQuestions * 0.2); // 20%
        
        // Function to get random questions from an array
        function getRandomQuestions(array, count) {
            const shuffled = [...array].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, array.length));
        }
        
        // If we don't have enough questions in a category, adjust the counts
        const actualEasyCount = Math.min(easyCount, easyQuestions.length);
        const actualMediumCount = Math.min(mediumCount, mediumQuestions.length);
        const actualHardCount = Math.min(hardCount, hardQuestions.length);
        
        // Calculate how many more questions we need to reach the total
        const selectedCount = actualEasyCount + actualMediumCount + actualHardCount;
        const remainingCount = totalQuestions - selectedCount;
        
        // Select questions based on difficulty
        let selectedQuestions = [
            ...getRandomQuestions(easyQuestions, actualEasyCount),
            ...getRandomQuestions(mediumQuestions, actualMediumCount),
            ...getRandomQuestions(hardQuestions, actualHardCount)
        ];
        
        // If we don't have enough questions from the specified difficulties,
        // add more from the available questions
        if (remainingCount > 0 && allQuestions.length > selectedCount) {
            // Filter out questions that are already selected
            const remainingQuestions = allQuestions.filter(q => 
                !selectedQuestions.some(sq => 
                    sq.question === q.question && sq.answer === q.answer
                )
            );
            
            // Add more questions randomly
            selectedQuestions = [
                ...selectedQuestions,
                ...getRandomQuestions(remainingQuestions, remainingCount)
            ];
        }
        
        // Shuffle the selected questions
        return selectedQuestions.sort(() => 0.5 - Math.random());
    }
    
    // Function to start the study session
    function startStudySession() {
        console.log("Starting study session with questions:", state.questions);
        
        // Reset state
        state.currentQuestionIndex = 0;
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
        
        // Filter questions based on difficulty
        state.questions = filterQuestionsByDifficulty(state.questions);
        
        // Initialize category mastery overview
        updateCategoryMasteryOverview();
        
        // Update UI
        updateStats();
        showScreen('study');
        loadQuestion();
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

    // Function to load the current question
    function loadQuestion() {
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
        
        // Check if the category is mastered
        const category = currentQuestion.category;
        const isCategoryMastered = state.categories[category].isMastered;
        
        // Show or hide mastery badge
        elements.mastery.classList.toggle('hidden', !isCategoryMastered);
        
        // Display the question - Use KaTeX to render the equation
        elements.questionDisplay.textContent = currentQuestion.question;
        
        // Render math with KaTeX
        if (window.katex) {
            renderMathInElement(elements.questionDisplay, {
                delimiters: [
                    {left: "\\(", right: "\\)", display: false}
                ]
            });
        }
        
        // Reset answer input and preview
        elements.answerInput.value = '';
        if (elements.formattedAnswerPreview) {
            elements.formattedAnswerPreview.innerHTML = '';
        }
        if (elements.answerInput) {
            elements.answerInput.classList.remove('format-active');
        }
        
        // Set up for MCQ or FRQ
        if (state.isMCQ) {
            // Show MCQ container, hide FRQ container
            elements.frqContainer.classList.add('hidden');
            elements.mcqContainer.classList.remove('hidden');
            
            // Clear selected option
            state.selectedMCQOption = null;
            
            // Generate MCQ options
            let options = currentQuestion.options;
            if (Array.isArray(options) && !options.includes(currentQuestion.answer)) {
                // Make sure the correct answer is included in the options
                options.push(currentQuestion.answer);
            }
            generateMCQOptions(options, currentQuestion.answer);
        } else {
            // Show FRQ container, hide MCQ container
            elements.frqContainer.classList.remove('hidden');
            elements.mcqContainer.classList.add('hidden');
            elements.answerInput.focus();
        }
        
        // Show category, difficulty, and target time
        const difficulty = currentQuestion.difficulty || 'medium';
        const targetTime = currentQuestion.time || DEFAULT_TIME;
        
        elements.categoryDisplay.textContent = `Category: ${category.replace(/_/g, ' ')}`;
        elements.difficultyDisplay.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
        elements.targetTime.textContent = `Target: ${targetTime}s`;
        
        // Update mastery progress for this category
        updateMasteryDisplay(category);
        
        // Update progress
        const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
        elements.progressFill.style.width = `${progress}%`;
        elements.questionCounter.textContent = `Question ${state.currentQuestionIndex + 1}/${state.questions.length}`;
        
        // Reset and start timer
        elapsedTime = 0;
        state.questionStartTime = Date.now();
        startTimer();
    }
    
    // Function to generate MCQ options
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
            optionElement.textContent = option;
            
            // If option contains math expressions, render with KaTeX
            if (/(\d+)\/(\d+)/.test(option) || /(\d+)\^(\d+)/.test(option)) {
                optionElement.textContent = formatMathEquation(option);
                if (window.katex) {
                    renderMathInElement(optionElement, {
                        delimiters: [
                            {left: "\\(", right: "\\)", display: false}
                        ]
                    });
                }
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
    function updateCategoryMasteryOverview() {
        // Clear the container
        elements.categoryMasteryOverview.innerHTML = '';
        
        // Create an item for each category
        Object.keys(state.categories).forEach(category => {
            const catData = state.categories[category];
            const performanceData = state.categoryPerformance[category];
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-mastery-item';
            
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
            
            // Add mastery badge if mastered
            if (catData.isMastered) {
                const badge = document.createElement('div');
                badge.className = 'category-badge';
                badge.textContent = '✓';
                categoryItem.appendChild(badge);
            }
            
            masteryBar.appendChild(masteryFill);
            
            categoryItem.appendChild(categoryName);
            categoryItem.appendChild(masteryBar);
            categoryItem.appendChild(masteryValue);
            
            elements.categoryMasteryOverview.appendChild(categoryItem);
        });
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

    // Function to submit answer
    function submitAnswer() {
        const timeTaken = stopTimer();
        const currentQuestion = state.questions[state.currentQuestionIndex];
        
        if (!currentQuestion) {
            console.error("No current question found during submit");
            return;
        }
        
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
        } else {
            userAnswer = elements.answerInput.value.trim();
        }
        
        const isCorrect = userAnswer === currentQuestion.answer;
        const isWithinTimeLimit = timeTaken <= targetTime;
        
        console.log("Answer submitted:", userAnswer, "Correct:", isCorrect, 
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
        } else {
            state.incorrectAnswers++;
            state.categories[category].incorrect++;
            elements.answerFeedback.textContent = `Incorrect. The correct answer is: ${currentQuestion.answer}`;
            elements.answerFeedback.className = 'incorrect';
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
        
        // Update stats
        updateStats();
        
        // Update category mastery overview
        updateCategoryMasteryOverview();
        
        // Show feedback screen
        showScreen('feedback');
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
        
        if (state.currentQuestionIndex < state.questions.length) {
            showScreen('study');
            loadQuestion();
        } else {
            showResults();
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
    
    // KaTeX helper function
    function renderMathInElement(element, options) {
        if (window.renderMathInElement) {
            window.renderMathInElement(element, options);
        }
    }
});