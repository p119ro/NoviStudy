exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
  
    try {
      // Parse the request body
      const data = JSON.parse(event.body);
      const { username, password } = data;
      
      if (!username || !password) {
        return { 
          statusCode: 400, 
          body: JSON.stringify({ success: false, message: "Missing credentials" }) 
        };
      }
  
      // Check against environment variables
      const isAdmin = 
        username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase() && 
        password === process.env.ADMIN_PASSWORD;
  
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          isAdmin: isAdmin,
          message: isAdmin ? "Valid admin credentials" : "Invalid credentials"
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: "Server error" })
      };
    }
  };