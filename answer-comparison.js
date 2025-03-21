// Gemini AI-powered answer comparison
window.QuickStudyAI = (function() {
    // Initialize as null, will be populated via API call
    let GEMINI_API_KEY = null;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";
    
    // Flag to track if we're currently fetching the API key
    let isLoadingApiKey = false;
    // Queue of callbacks waiting for API key
    let apiKeyCallbacks = [];

    // Function to get API key from server
    async function getApiKey() {
        // If we're already loading the key, don't make another request
        if (isLoadingApiKey) {
            return new Promise((resolve) => {
                apiKeyCallbacks.push(resolve);
            });
        }

        // If we already have the key, return it
        if (GEMINI_API_KEY) {
            return GEMINI_API_KEY;
        }

        // Set flag that we're loading the key
        isLoadingApiKey = true;

        try {
            const response = await fetch('/.netlify/functions/get-gemini-key');
            if (!response.ok) {
                throw new Error(`Failed to get API key: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            GEMINI_API_KEY = data.key;
            
            // Resolve all waiting callbacks
            apiKeyCallbacks.forEach(callback => callback(GEMINI_API_KEY));
            apiKeyCallbacks = [];
            
            console.log("QuickStudyAI: Successfully retrieved API key");
            return GEMINI_API_KEY;
        } catch (error) {
            console.error("Error fetching API key:", error);
            
            // Resolve all waiting callbacks with null
            apiKeyCallbacks.forEach(callback => callback(null));
            apiKeyCallbacks = [];
            
            return null;
        } finally {
            isLoadingApiKey = false;
        }
    }

    // Keep a context for chat history to enable follow-up questions
    const chatContext = {
        currentQuestion: "",
        userAnswer: "",
        expectedAnswer: "",
        wasCorrect: false,
        conversationHistory: []
    };

    /**
     * Compares the user's answer with the expected answer using Gemini AI
     * @param {string} userAnswer - The answer provided by the user
     * @param {string} expectedAnswer - The expected correct answer
     * @param {string} question - The original question (for context)
     * @param {Function} callback - Callback with result (true/false)
     */
    async function compareAnswers(userAnswer, expectedAnswer, question, callback) {
        console.log("QuickStudyAI: Comparing answers");
        console.log("User Answer:", userAnswer);
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        
        // Store context for future chat interactions
        chatContext.currentQuestion = question;
        chatContext.userAnswer = userAnswer;
        chatContext.expectedAnswer = expectedAnswer;
        chatContext.conversationHistory = []; // Reset conversation history for new question
        
        // If answers match exactly, no need to call the API
        if (userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()) {
            console.log("QuickStudyAI: Exact match found, bypassing API");
            chatContext.wasCorrect = true;
            callback(true);
            return;
        }

        // Empty answers are incorrect
        if (!userAnswer.trim()) {
            console.log("QuickStudyAI: Empty answer, marking as incorrect");
            chatContext.wasCorrect = false;
            callback(false);
            return;
        }

        // Make sure we have a valid API key before proceeding
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("QuickStudyAI: No API key available, using fallback check");
            const isCorrect = fallbackCheck();
            chatContext.wasCorrect = isCorrect;
            callback(isCorrect);
            return;
        }

        // Construct the prompt for Gemini
        const prompt = `
            Question: "${question}"
            
            Expected Answer: "${expectedAnswer}"
            
            User's Answer: "${userAnswer}"
            
            Evaluate if the user's answer is conceptually correct compared to the expected answer, even if the wording is different.
            Consider that this is for an educational application, so be somewhat lenient but still ensure the core concepts are correct.
            Only respond with "YES" if the user's answer is correct, or "NO" if it's incorrect. 
            Don't include any explanation, just YES or NO.
        `;

        console.log("QuickStudyAI: Calling Gemini API");
        
        // Fallback check in case API fails
        function fallbackCheck() {
            console.log("QuickStudyAI: Using fallback similarity check");
            // Basic text similarity check
            const userWords = userAnswer.trim().toLowerCase().split(/\s+/);
            const expectedWords = expectedAnswer.trim().toLowerCase().split(/\s+/);
            const commonWords = userWords.filter(word => expectedWords.includes(word));
            const similarity = commonWords.length / Math.max(1, expectedWords.length);
            
            console.log("QuickStudyAI: Text similarity:", similarity);
            // If similarity is high enough, consider it correct
            return similarity > 0.6;
        }
        
        // Call the Gemini API
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("QuickStudyAI: Gemini API response:", data);
            
            // Check if the response has the expected structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error("QuickStudyAI: Unexpected API response structure:", data);
                throw new Error("Unexpected API response structure");
            }
            
            // Extract the response text
            const aiResponse = data.candidates[0].content.parts[0].text.trim().toUpperCase();
            console.log("QuickStudyAI: AI response:", aiResponse);
            
            // Update chat context
            chatContext.wasCorrect = aiResponse === "YES";
            
            // Return true if the AI says YES
            callback(aiResponse === "YES");
        } catch (error) {
            console.error("QuickStudyAI: Error comparing answers with AI:", error);
            // Fall back to basic comparison if API fails
            console.log("QuickStudyAI: Falling back to similarity check due to API error");
            const isCorrect = fallbackCheck();
            chatContext.wasCorrect = isCorrect;
            callback(isCorrect);
        }
    }

    /**
     * Gets explanation for why an answer is correct or incorrect
     * @param {string} userAnswer - The answer provided by the user
     * @param {string} expectedAnswer - The expected correct answer
     * @param {string} question - The original question (for context)
     * @param {boolean} wasCorrect - Whether the answer was marked correct
     * @param {Function} callback - Callback with explanation text result
     */
    async function getExplanation(userAnswer, expectedAnswer, question, wasCorrect, callback) {
        console.log("QuickStudyAI: Getting explanation");
        console.log("User Answer:", userAnswer);
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        console.log("Was correct:", wasCorrect);
        
        // Update chat context for follow-up questions
        chatContext.currentQuestion = question;
        chatContext.userAnswer = userAnswer;
        chatContext.expectedAnswer = expectedAnswer;
        chatContext.wasCorrect = wasCorrect;
        chatContext.conversationHistory = []; // Reset for new explanation
        
        // Make sure we have a valid API key before proceeding
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("QuickStudyAI: No API key available, using default explanation");
            const defaultExplanation = getDefaultExplanation();
            chatContext.conversationHistory.push({
                role: "assistant",
                content: defaultExplanation
            });
            callback(defaultExplanation);
            return;
        }
        
        // Construct the prompt for Gemini
        const prompt = `
            Question: "${question}"
            
            Correct Answer: "${expectedAnswer}"
            
            User's Answer: "${userAnswer}"
            
            Was marked: ${wasCorrect ? "CORRECT" : "INCORRECT"}
            
            You are an educational AI that provides clear, concise explanations for math and science problems. Please provide:
            
            ${wasCorrect 
                ? "1. Confirm why this answer is correct."
                : "1. Explain why the user's answer is incorrect."
            }
            2. Show a step-by-step solution to this problem, labeling each step clearly as 'Step 1:', 'Step 2:', etc.
            3. Provide a concise explanation (3-5 sentences) of the key concept being tested, labeled as 'Key Concept:'.
            
            Use markdown formatting with ** for bold text and * for italic text where appropriate.
            Format mathematical expressions clearly and use examples if helpful.
        `;

        // Fallback explanation in case API fails
        function getDefaultExplanation() {
            if (wasCorrect) {
                return `
## Great job!

Your answer "${userAnswer}" is correct. The expected answer was "${expectedAnswer}".

**Step 1:** Understand the problem and identify the appropriate approach.
**Step 2:** Apply the correct formula or method.
**Step 3:** Calculate the result carefully.

**Key Concept:**
This question tests your understanding of the specific concept being asked about. 
Continue practicing similar problems to strengthen your understanding.
`;
            } else {
                return `
## Let's review this

Your answer was "${userAnswer}", but the correct answer is "${expectedAnswer}".

**Step 1:** Understand what the question is asking.
**Step 2:** Identify the correct approach or formula.
**Step 3:** Work through the solution methodically.
**Step 4:** Check your work for errors.

**Key Concept:**
This question tests your understanding of the specific concept being asked about.
Make sure to review this topic in your notes or textbook.
`;
            }
        }
        
        // Call the Gemini API
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1000
                    }
                })
            });
            
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("QuickStudyAI: Gemini API explanation response:", data);
            
            // Check if the response has the expected structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error("QuickStudyAI: Unexpected API response structure:", data);
                throw new Error("Unexpected API response structure");
            }
            
            // Extract the response text
            const explanation = data.candidates[0].content.parts[0].text.trim();
            console.log("QuickStudyAI: Generated explanation:", explanation);
            
            // Store the initial explanation in conversation history
            chatContext.conversationHistory.push({
                role: "assistant",
                content: explanation
            });
            
            callback(explanation);
        } catch (error) {
            console.error("QuickStudyAI: Error getting explanation with AI:", error);
            const defaultExplanation = getDefaultExplanation();
            
            // Store default explanation in conversation history
            chatContext.conversationHistory.push({
                role: "assistant",
                content: defaultExplanation
            });
            
            callback(defaultExplanation);
        }
    }

    /**
     * Handles a follow-up question about the explanation
     * @param {string} question - The follow-up question from user
     * @param {Function} callback - Callback with response text
     */
    async function handleFollowUpQuestion(question, callback) {
        console.log("QuickStudyAI: Processing follow-up question");
        console.log("Question:", question);
        
        // Add user question to conversation history
        chatContext.conversationHistory.push({
            role: "user",
            content: question
        });
        
        // Make sure we have a valid API key before proceeding
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("QuickStudyAI: No API key available, using default response");
            const defaultResponse = getDefaultResponse();
            chatContext.conversationHistory.push({
                role: "assistant",
                content: defaultResponse
            });
            callback(defaultResponse);
            return;
        }
        
        // Create a conversation history string for context
        let conversationHistoryText = "";
        if (chatContext.conversationHistory.length > 0) {
            chatContext.conversationHistory.forEach((msg, index) => {
                if (index === 0) return; // Skip the first assistant message (full explanation)
                conversationHistoryText += `${msg.role === "user" ? "User" : "AI"}: ${msg.content}\n\n`;
            });
        }
        
        // Construct prompt for Gemini with appropriate context
        const prompt = `
            You are an educational AI assistant helping a student understand a problem and its solution.
            
            Original Question: "${chatContext.currentQuestion}"
            Correct Answer: "${chatContext.expectedAnswer}"
            Student's Answer: "${chatContext.userAnswer}"
            The answer was marked: ${chatContext.wasCorrect ? "CORRECT" : "INCORRECT"}
            
            ${conversationHistoryText ? `Previous conversation:\n${conversationHistoryText}\n` : ""}
            
            Student's follow-up question: "${question}"
            
            Provide a helpful response that addresses their specific question. Be educational, clear, and concise.
            If appropriate, refer to specific steps in the solution or specific concepts.
            Use markdown formatting with ** for bold text and * for italic text where appropriate.
            Format mathematical expressions clearly.
            Keep your response focused and under 250 words unless more detail is absolutely necessary.
        `;
        
        // Fallback response in case API fails
        function getDefaultResponse() {
            return `I'm sorry, I couldn't process your follow-up question properly. The answer to "${chatContext.currentQuestion}" is "${chatContext.expectedAnswer}". If you're still confused, consider breaking your question into smaller parts or asking about specific steps in the solution.`;
        }
        
        // Call the Gemini API
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 600
                    }
                })
            });
            
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("QuickStudyAI: Gemini API follow-up response:", data);
            
            // Check if the response has the expected structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error("QuickStudyAI: Unexpected API response structure:", data);
                throw new Error("Unexpected API response structure");
            }
            
            // Extract the response text
            const response_text = data.candidates[0].content.parts[0].text.trim();
            console.log("QuickStudyAI: Follow-up response:", response_text);
            
            // Add response to conversation history
            chatContext.conversationHistory.push({
                role: "assistant",
                content: response_text
            });
            
            callback(response_text);
        } catch (error) {
            console.error("QuickStudyAI: Error getting follow-up response with AI:", error);
            const defaultResponse = getDefaultResponse();
            
            // Add fallback response to conversation history
            chatContext.conversationHistory.push({
                role: "assistant",
                content: defaultResponse
            });
            
            callback(defaultResponse);
        }
    }

    /**
     * Formats the correct answer for display when the user answers incorrectly
     * @param {string} expectedAnswer - The expected correct answer 
     * @param {string} question - The original question (for context)
     * @param {Function} callback - Callback with formatted answer text
     */
    async function formatCorrectAnswer(expectedAnswer, question, callback) {
        console.log("QuickStudyAI: Formatting correct answer");
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        
        // Make sure we have a valid API key before proceeding
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("QuickStudyAI: No API key available, using default formatting");
            callback(getDefaultFormatting());
            return;
        }
        
        // Construct the prompt for Gemini
        const prompt = `
            Question: "${question}"
            
            Correct Answer: "${expectedAnswer}"
            
            Format this answer to be clearly readable. If it has multiple parts or steps, separate them clearly.
            For math expressions, use clean notation.
            For multiple answers, number them and display each on a new line.
            Keep your response short and focused on just presenting the correct answer in a readable way.
            Do not include explanations, just format the answer nicely.
        `;

        // Fallback formatting in case API fails
        function getDefaultFormatting() {
            // Simple formatting for numbered answers
            if (expectedAnswer.includes('1.') && expectedAnswer.includes('2.')) {
                // Has numbering already, just clean up LaTeX
                return expectedAnswer.replace(/\\[\(\)]/g, '')
                    .replace(/\\frac{(\d+)}{(\d+)}/g, '$1/$2')
                    .replace(/(\d+)\^{(\d+)}/g, '$1^$2');
            } else {
                // Just clean up the string
                return expectedAnswer.replace(/\\[\(\)]/g, '')
                    .replace(/\\frac{(\d+)}{(\d+)}/g, '$1/$2')
                    .replace(/(\d+)\^{(\d+)}/g, '$1^$2');
            }
        }
        
        // Call the Gemini API
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 200
                    }
                })
            });
            
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("QuickStudyAI: Gemini API formatting response:", data);
            
            // Check if the response has the expected structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error("QuickStudyAI: Unexpected API response structure:", data);
                throw new Error("Unexpected API response structure");
            }
            
            // Extract the response text
            const formattedAnswer = data.candidates[0].content.parts[0].text.trim();
            console.log("QuickStudyAI: Formatted answer:", formattedAnswer);
            
            callback(formattedAnswer);
        } catch (error) {
            console.error("QuickStudyAI: Error formatting answer with AI:", error);
            callback(getDefaultFormatting());
        }
    }

    /**
     * Formats the question text to properly differentiate variables from regular text
     * @param {string} questionText - The original question text
     * @param {Function} callback - Callback with formatted question text
     */
    async function formatQuestionText(questionText, callback) {
        console.log("QuickStudyAI: Formatting question text");
        
        // Make sure we have a valid API key before proceeding
        const apiKey = await getApiKey();
        if (!apiKey) {
            console.error("QuickStudyAI: No API key available, using default formatting");
            callback(getDefaultFormatting());
            return;
        }
        
        // Construct the prompt for Gemini
        const prompt = `
            Original question: "${questionText}"
            
            Format this question to properly distinguish between mathematical variables and regular text.
            Mathematical variables should be properly formatted, while regular text should remain normal.
            For example, "Find x in the equation 3x + 4 = 10" should keep "x" as a variable, but "Find" should not be italicized.
            Keep your response focused just on the reformatted question.
            Do not include explanations, just format the text properly.
        `;

        // Fallback if API fails
        function getDefaultFormatting() {
            return questionText; // Just return original text
        }
        
        // Call the Gemini API
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 300
                    }
                })
            });
            
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("QuickStudyAI: Gemini API question formatting response:", data);
            
            // Check if the response has the expected structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error("QuickStudyAI: Unexpected API response structure:", data);
                throw new Error("Unexpected API response structure");
            }
            
            // Extract the response text
            const formattedQuestion = data.candidates[0].content.parts[0].text.trim();
            console.log("QuickStudyAI: Formatted question:", formattedQuestion);
            
            callback(formattedQuestion);
        } catch (error) {
            console.error("QuickStudyAI: Error formatting question with AI:", error);
            callback(getDefaultFormatting());
        }
    }

    // The rest of the functions remain the same, just update them to use the API key from getApiKey()
    // For brevity, I'll keep these functions as they are in this example
    
    /**
     * Creates a chat UI under the explanation to allow follow-up questions
     * @param {HTMLElement} container - The container to add the chat UI to
     * @param {Function} onQuestionSubmit - Callback when a question is submitted
     * @returns {Object} - Object with methods to update the chat UI
     */
    function createChatUI(container, onQuestionSubmit) {
        console.log("QuickStudyAI: Creating chat UI");
        
        // Create chat UI elements
        const chatContainer = document.createElement('div');
        chatContainer.className = 'explanation-chat-container';
        
        // Chat history container
        const chatHistory = document.createElement('div');
        chatHistory.className = 'explanation-chat-history';
        
        // Chat input area
        const chatInputContainer = document.createElement('div');
        chatInputContainer.className = 'explanation-chat-input-container';
        
        const chatInput = document.createElement('textarea');
        chatInput.className = 'explanation-chat-input';
        chatInput.placeholder = 'Ask a follow-up question about this explanation...';
        chatInput.rows = 2;
        
        const chatSubmitBtn = document.createElement('button');
        chatSubmitBtn.className = 'explanation-chat-submit';
        chatSubmitBtn.textContent = 'Ask';
        
        // Add everything to the container
        chatInputContainer.appendChild(chatInput);
        chatInputContainer.appendChild(chatSubmitBtn);
        
        chatContainer.appendChild(document.createElement('hr'));
        
        // Add a heading for the follow-up section
        const followUpHeading = document.createElement('h3');
        followUpHeading.className = 'explanation-chat-heading';
        followUpHeading.textContent = 'Still confused? Ask a follow-up question:';
        chatContainer.appendChild(followUpHeading);
        
        chatContainer.appendChild(chatHistory);
        chatContainer.appendChild(chatInputContainer);
        
        // Add to the provided container
        container.appendChild(chatContainer);
        
        // Attach event listeners
        chatSubmitBtn.addEventListener('click', submitQuestion);
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitQuestion();
            }
        });
        
        // Add auto-resize functionality for textarea
        chatInput.addEventListener('input', function() {
            // Reset height first to get accurate scrollHeight
            this.style.height = 'auto';
            // Set height based on content (add a small buffer to avoid scrollbar flickering)
            this.style.height = (this.scrollHeight + 2) + 'px';
        });
        
        // Initial resize on creation
        setTimeout(function() {
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight + 2) + 'px';
        }, 0);
        
        // Submit question function
        function submitQuestion() {
            const question = chatInput.value.trim();
            if (!question) return;
            
            // Clear input
            chatInput.value = '';
            
            // Add user question to the chat history UI
            addMessageToChat('user', question);
            
            // Show loading state
            const loadingIndicator = addLoadingIndicator();
            
            // Call the provided callback
            onQuestionSubmit(question, function(response) {
                // Remove loading indicator
                loadingIndicator.remove();
                
                // Add AI response to the chat history UI
                addMessageToChat('assistant', response);
            });
        }
        
        // Function to add a message to the chat UI
        function addMessageToChat(role, content) {
            const messageElement = document.createElement('div');
            messageElement.className = `explanation-chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
            
            // Format the content with markdown if it's from the AI
            if (role === 'assistant') {
                // Use the existing formatMarkdown function if available
                if (typeof window.formatMarkdown === 'function') {
                    content = window.formatMarkdown(content);
                } else {
                    // Simple markdown formatting
                    content = content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br>');
                }
            }
            
            messageElement.innerHTML = content;
            chatHistory.appendChild(messageElement);
            
            // Scroll to the bottom
            chatHistory.scrollTop = chatHistory.scrollHeight;
            
            return messageElement;
        }
        
        // Function to add a loading indicator
        function addLoadingIndicator() {
            const loadingElement = document.createElement('div');
            loadingElement.className = 'explanation-chat-message ai-message loading';
            loadingElement.innerHTML = '<span class="processing-indicator"></span> Thinking...';
            chatHistory.appendChild(loadingElement);
            
            // Scroll to the bottom
            chatHistory.scrollTop = chatHistory.scrollHeight;
            
            return loadingElement;
        }
        
        // Return methods to update the chat UI
        return {
            addMessage: addMessageToChat,
            clear: function() {
                chatHistory.innerHTML = '';
                chatInput.value = '';
            }
        };
    }

    /**
     * Adds CSS styles for the chat UI
     */
    function addChatStyles() {
        // Check if styles already exist
        if (document.getElementById('quickstudy-chat-styles')) return;
        
        // Create a style element
        const style = document.createElement('style');
        style.id = 'quickstudy-chat-styles';
        
        // Add CSS for chat UI
        style.textContent = `
            .explanation-chat-container {
                margin-top: 20px;
                border-top: 1px solid #e0e0e0;
                padding-top: 15px;
            }
            
            .dark-mode .explanation-chat-container {
                border-top-color: #546e7a;
            }
            
            .explanation-chat-heading {
                margin-bottom: 15px;
                color: var(--primary-color);
                font-size: 1.1rem;
            }
            
            .explanation-chat-history {
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 15px;
                padding: 10px;
                background-color: rgba(0, 0, 0, 0.02);
                border-radius: 8px;
            }
            
            .dark-mode .explanation-chat-history {
                background-color: rgba(0, 0, 0, 0.2);
            }
            
            .explanation-chat-message {
                padding: 10px 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                max-width: 90%;
                line-height: 1.5;
            }
            
            .explanation-chat-message.user-message {
                background-color: rgba(52, 152, 219, 0.1);
                border-left: 3px solid var(--primary-color);
                align-self: flex-end;
                margin-left: auto;
            }
            
            .explanation-chat-message.ai-message {
                background-color: white;
                border-left: 3px solid var(--success-color);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .dark-mode .explanation-chat-message.ai-message {
                background-color: #2c3e50;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }
            
            .explanation-chat-message.loading {
                font-style: italic;
                color: #7f8c8d;
            }
            
            .dark-mode .explanation-chat-message.loading {
                color: #bdc3c7;
            }
            
            .explanation-chat-input-container {
                display: flex;
                gap: 10px;
            }
            
            .explanation-chat-input {
                flex: 1;
                padding: 12px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 0.95rem;
                resize: vertical;
                min-height: 45px;
                max-height: 150px;
                transition: all 0.3s ease;
                overflow-y: auto;
                word-wrap: break-word;
                white-space: pre-wrap;
                line-height: 1.5;
                display: block;
                overflow-x: hidden;
                box-sizing: border-box;
                width: 100%;
            }
            
            .dark-mode .explanation-chat-input {
                background-color: #2c3e50;
                border-color: #546e7a;
                color: white;
            }
            
            .explanation-chat-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
            }
            
            .dark-mode .explanation-chat-input:focus {
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.4);
            }
            
            .explanation-chat-submit {
                background-color: var(--primary-color);
                color: white;
                border: none;
                padding: 0 20px;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                align-self: flex-end;
                height: 45px;
            }
            
            .explanation-chat-submit:hover {
                background-color: var(--primary-dark);
                transform: translateY(-2px);
            }
        `;
        
        // Add to document head
        document.head.appendChild(style);
        console.log("QuickStudyAI: Added chat UI styles");
    }

    // Initialize
    (async function init() {
        console.log("QuickStudyAI: Initializing");
        addChatStyles();
        
        // Try to get the API key at startup
        const apiKey = await getApiKey();
        if (apiKey) {
            console.log("QuickStudyAI: Successfully initialized with API key");
        } else {
            console.warn("QuickStudyAI: Failed to get API key at initialization, will try again when needed");
        }
    })();

    // Public API
    return {
        compareAnswers: compareAnswers,
        getExplanation: getExplanation,
        formatCorrectAnswer: formatCorrectAnswer,
        formatQuestionText: formatQuestionText,
        handleFollowUpQuestion: handleFollowUpQuestion,
        createChatUI: createChatUI
    };
})();