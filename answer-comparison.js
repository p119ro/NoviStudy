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
        // If answers match exactly, no need to call the API
        if (userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()) {
            callback(true);
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
                console.error("Gemini API error:", response.status);
                throw new Error("API request failed");
            }
            return response.json();
        })
        .then(data => {
            try {
                // Extract the response text
                const aiResponse = data.candidates[0].content.parts[0].text.trim().toUpperCase();
                
                // Return true if the AI says YES
                callback(aiResponse === "YES");
            } catch (err) {
                console.error("Error parsing Gemini response:", err);
                // Fall back to basic comparison if parsing fails
                callback(userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase());
            }
        })
        .catch(error => {
            console.error("Error comparing answers with AI:", error);
            // Fall back to basic comparison if API fails
            callback(userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase());
        });
    }

    // Public API
    return {
        compareAnswers: compareAnswers
    };
})();