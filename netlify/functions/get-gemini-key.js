// This should be in a file like functions/get-gemini-key.js
exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Log the environment variable for debugging
    console.log("Environment variables available:", Object.keys(process.env));
    
    // Check if the key exists
    if (!process.env.GEMINI_AI_KEY) {
      console.log("GEMINI_AI_KEY is not defined in environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: "API key not found in environment variables",
          hint: "Check that GEMINI_AI_KEY is correctly set in Netlify environment variables"
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        key: process.env.GEMINI_AI_KEY
      })
    };
  } catch (error) {
    console.log("Error in Netlify function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to get API key", 
        message: error.message 
      })
    };
  }
};