// This should be in a file like functions/get-gemini-key.js
exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Look for either variable name, with preference for GEMINI_API_KEY since that's what you have set
    const apiKey = process.env.GEMINI_API_KEY
    
    // Check if either key exists
    if (!apiKey) {
      console.log("GEMINI_API_KEY is not defined in environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: "API key not found in environment variables",
          hint: "Check that GEMINI_API_KEY is correctly set in Netlify environment variables"
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        key: apiKey
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