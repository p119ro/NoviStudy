// netlify/functions/user-management.js
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  
  try {
    const data = JSON.parse(event.body);
    const { action, payload } = data;
    
    // Get the users store
    const usersStore = getStore("user-database");
    
    // Different actions based on request
    switch (action) {
      case 'getUsers':
        // Get users from blob store
        const usersData = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, users: usersData.users }) 
        };
        
      case 'addUser':
        // Get existing users
        let dbForAdd = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        
        // Check if email already exists
        if (dbForAdd.users.some(u => u.email.toLowerCase() === payload.user.email.toLowerCase())) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Email already in use' }) 
          };
        }
        
        // Add the user and save
        dbForAdd.users.push(payload.user);
        await usersStore.setJSON("users-list", dbForAdd);
        
        console.log("User added successfully:", payload.user.email);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User added successfully' }) 
        };
        
      case 'updateUser':
        // Get existing users
        let dbForUpdate = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        const userIndex = dbForUpdate.users.findIndex(u => u.uid === payload.user.uid);
        
        if (userIndex === -1) {
          return { 
            statusCode: 404, 
            body: JSON.stringify({ success: false, message: 'User not found' }) 
          };
        }
        
        // Update user and save
        dbForUpdate.users[userIndex] = payload.user;
        await usersStore.setJSON("users-list", dbForUpdate);
        
        console.log("User updated successfully:", payload.user.email);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User updated successfully' }) 
        };
        
      case 'deleteUser':
        // Get existing users
        let dbForDelete = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        
        // Filter out deleted user
        dbForDelete.users = dbForDelete.users.filter(u => u.uid !== payload.uid);
        
        // Save updated list
        await usersStore.setJSON("users-list", dbForDelete);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User deleted successfully' }) 
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
      body: JSON.stringify({ 
        success: false, 
        message: 'Server error', 
        error: error.message,
        stack: error.stack // Include stack trace for debugging
      }) 
    };
  }
};