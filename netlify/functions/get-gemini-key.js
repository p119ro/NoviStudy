exports.handler = async function(event, context) {
    // Only allow GET requests
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
  
    try {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          key: process.env.GEMINI_AI_KEY
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to get API key" })
      };
    }
  };