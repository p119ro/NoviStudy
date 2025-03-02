// Gemini AI-powered answer comparison
window.QuickStudyAI = (function() {
    const GEMINI_API_KEY = "AIzaSyDcFHXQESrEooiFRIdvxDVeLmQ_VZPlzKE"; // In production, this should NEVER be in client-side code
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

    /**
     * Compares the user's answer with the expected answer using Gemini AI
     * @param {string} userAnswer - The answer provided by the user
     * @param {string} expectedAnswer - The expected correct answer
     * @param {string} question - The original question (for context)
     * @param {Function} callback - Callback with result (true/false)
     */
    function compareAnswers(userAnswer, expectedAnswer, question, callback) {
        console.log("QuickStudyAI: Comparing answers");
        console.log("User Answer:", userAnswer);
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        
        // If answers match exactly, no need to call the API
        if (userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()) {
            console.log("QuickStudyAI: Exact match found, bypassing API");
            callback(true);
            return;
        }

        // Empty answers are incorrect
        if (!userAnswer.trim()) {
            console.log("QuickStudyAI: Empty answer, marking as incorrect");
            callback(false);
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
        fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
        })
        .then(response => {
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            try {
                console.log("QuickStudyAI: Gemini API response:", data);
                
                // Check if the response has the expected structure
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                    console.error("QuickStudyAI: Unexpected API response structure:", data);
                    throw new Error("Unexpected API response structure");
                }
                
                // Extract the response text
                const aiResponse = data.candidates[0].content.parts[0].text.trim().toUpperCase();
                console.log("QuickStudyAI: AI response:", aiResponse);
                
                // Return true if the AI says YES
                callback(aiResponse === "YES");
            } catch (err) {
                console.error("QuickStudyAI: Error parsing Gemini response:", err);
                // Fall back to basic comparison if parsing fails
                console.log("QuickStudyAI: Falling back to similarity check due to parsing error");
                callback(fallbackCheck());
            }
        })
        .catch(error => {
            console.error("QuickStudyAI: Error comparing answers with AI:", error);
            // Fall back to basic comparison if API fails
            console.log("QuickStudyAI: Falling back to similarity check due to API error");
            callback(fallbackCheck());
        });
    }

    /**
     * Gets explanation for why an answer is correct or incorrect
     * @param {string} userAnswer - The answer provided by the user
     * @param {string} expectedAnswer - The expected correct answer
     * @param {string} question - The original question (for context)
     * @param {boolean} wasCorrect - Whether the answer was marked correct
     * @param {Function} callback - Callback with explanation text result
     */
    function getExplanation(userAnswer, expectedAnswer, question, wasCorrect, callback) {
        console.log("QuickStudyAI: Getting explanation");
        console.log("User Answer:", userAnswer);
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        console.log("Was correct:", wasCorrect);
        
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
        fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
        })
        .then(response => {
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            try {
                console.log("QuickStudyAI: Gemini API explanation response:", data);
                
                // Check if the response has the expected structure
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                    console.error("QuickStudyAI: Unexpected API response structure:", data);
                    throw new Error("Unexpected API response structure");
                }
                
                // Extract the response text
                const explanation = data.candidates[0].content.parts[0].text.trim();
                console.log("QuickStudyAI: Generated explanation:", explanation);
                
                callback(explanation);
            } catch (err) {
                console.error("QuickStudyAI: Error parsing Gemini response:", err);
                callback(getDefaultExplanation());
            }
        })
        .catch(error => {
            console.error("QuickStudyAI: Error getting explanation with AI:", error);
            callback(getDefaultExplanation());
        });
    }

    /**
     * Formats the correct answer for display when the user answers incorrectly
     * @param {string} expectedAnswer - The expected correct answer 
     * @param {string} question - The original question (for context)
     * @param {Function} callback - Callback with formatted answer text
     */
    function formatCorrectAnswer(expectedAnswer, question, callback) {
        console.log("QuickStudyAI: Formatting correct answer");
        console.log("Expected Answer:", expectedAnswer);
        console.log("Question:", question);
        
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
        fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
        })
        .then(response => {
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            try {
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
            } catch (err) {
                console.error("QuickStudyAI: Error parsing Gemini response:", err);
                callback(getDefaultFormatting());
            }
        })
        .catch(error => {
            console.error("QuickStudyAI: Error formatting answer with AI:", error);
            callback(getDefaultFormatting());
        });
    }

    /**
     * Formats the question text to properly differentiate variables from regular text
     * @param {string} questionText - The original question text
     * @param {Function} callback - Callback with formatted question text
     */
    function formatQuestionText(questionText, callback) {
        console.log("QuickStudyAI: Formatting question text");
        
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
        fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
        })
        .then(response => {
            if (!response.ok) {
                console.error("QuickStudyAI: Gemini API error:", response.status, response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            try {
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
            } catch (err) {
                console.error("QuickStudyAI: Error parsing Gemini response:", err);
                callback(getDefaultFormatting());
            }
        })
        .catch(error => {
            console.error("QuickStudyAI: Error formatting question with AI:", error);
            callback(getDefaultFormatting());
        });
    }

    // Add a simple test to confirm the module loaded correctly
    console.log("QuickStudyAI module loaded successfully:", true);

    // Public API
    return {
        compareAnswers: compareAnswers,
        getExplanation: getExplanation,
        formatCorrectAnswer: formatCorrectAnswer,
        formatQuestionText: formatQuestionText
    };
})();