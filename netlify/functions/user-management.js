// netlify/functions/user-management.js
const { getStore } = require('@netlify/blobs');

// Database helper functions
async function getUsersDB() {
  try {
    const store = getStore('user-database');
    const data = await store.get('users', { type: 'json' });
    return data || { users: [] };
  } catch (error) {
    console.error('Error reading user database:', error);
    return { users: [] };
  }
}

async function saveUsersDB(data) {
  try {
    const store = getStore('user-database');
    await store.setJSON('users', data);
    return true;
  } catch (error) {
    console.error('Error writing user database:', error);
    return false;
  }
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  
  try {
    const data = JSON.parse(event.body);
    const { action, payload } = data;
    
    // User management actions
    switch (action) {
      case 'getUsers':
        // Return all users from the database
        const db = await getUsersDB();
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, users: db.users }) 
        };
        
      case 'addUser':
        // Add a new user to the database
        const dbForAdd = await getUsersDB();
        
        // Check if email already exists
        if (dbForAdd.users.some(u => u.email.toLowerCase() === payload.user.email.toLowerCase())) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Email already in use' }) 
          };
        }
        
        // Add the user and save
        dbForAdd.users.push(payload.user);
        await saveUsersDB(dbForAdd);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User added successfully' }) 
        };
        
      case 'updateUser':
        // Update an existing user
        const dbForUpdate = await getUsersDB();
        const userIndex = dbForUpdate.users.findIndex(u => u.uid === payload.user.uid);
        
        if (userIndex === -1) {
          return { 
            statusCode: 404, 
            body: JSON.stringify({ success: false, message: 'User not found' }) 
          };
        }
        
        // Update user and save
        dbForUpdate.users[userIndex] = payload.user;
        await saveUsersDB(dbForUpdate);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User updated successfully' }) 
        };
        
      case 'deleteUser':
        // Delete a user
        const dbForDelete = await getUsersDB();
        dbForDelete.users = dbForDelete.users.filter(u => u.uid !== payload.uid);
        await saveUsersDB(dbForDelete);
        
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
        stack: error.stack 
      }) 
    };
  }
};