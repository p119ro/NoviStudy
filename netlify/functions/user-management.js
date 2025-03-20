// netlify/functions/user-management.js
exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    
    try {
      const data = JSON.parse(event.body);
      const { action, payload } = data;
      
      // Get users from environment variable
      let userData;
      try {
        userData = JSON.parse(process.env.USER_DATA || '{"users":[]}');
      } catch (error) {
        console.error('Error parsing user data:', error);
        userData = { users: [] };
      }
      
      // Different actions based on request
      switch (action) {
        case 'getUsers':
          // Return all users
          return { 
            statusCode: 200, 
            body: JSON.stringify({ success: true, users: userData.users }) 
          };
          
        case 'addUser':
          // Check if email already exists
          if (userData.users.some(u => u.email.toLowerCase() === payload.user.email.toLowerCase())) {
            return { 
              statusCode: 400, 
              body: JSON.stringify({ success: false, message: 'Email already in use' }) 
            };
          }
          
          // Add the user
          userData.users.push(payload.user);
          
          // Return success but don't update environment variable (we'll handle this separately)
          return { 
            statusCode: 200, 
            body: JSON.stringify({ success: true, message: 'User added successfully', users: userData.users }) 
          };
          
        case 'updateUser':
          // Find user
          const userIndex = userData.users.findIndex(u => u.uid === payload.user.uid);
          
          if (userIndex === -1) {
            return { 
              statusCode: 404, 
              body: JSON.stringify({ success: false, message: 'User not found' }) 
            };
          }
          
          // Update user
          userData.users[userIndex] = payload.user;
          
          // Return success
          return { 
            statusCode: 200, 
            body: JSON.stringify({ success: true, message: 'User updated successfully', users: userData.users }) 
          };
          
        case 'deleteUser':
          // Filter out deleted user
          userData.users = userData.users.filter(u => u.uid !== payload.uid);
          
          // Return success
          return { 
            statusCode: 200, 
            body: JSON.stringify({ success: true, message: 'User deleted successfully', users: userData.users }) 
          };
          
        default:
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Invalid action' }) 
          };
      }
    } catch (error) {
      console.error('Error in user management function:', error);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ success: false, message: 'Server error', error: error.message }) 
      };
    }
  };