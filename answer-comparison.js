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

    // Public API
    return {
        compareAnswers: compareAnswers
    };
})();

// Add a simple test to confirm the module loaded correctly
console.log("QuickStudyAI module loaded successfully:", !!window.QuickStudyAI);