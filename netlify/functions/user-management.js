// netlify/functions/user-management.js
const fs = require('fs');
const path = require('path');

// Path to our "database" file
const DB_PATH = path.join('/tmp', 'users.json');

// Helper to read the user database
function readUserDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return { users: [] };
  } catch (error) {
    console.error('Error reading user database:', error);
    return { users: [] };
  }
}

// Helper to write to the user database
function writeUserDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data));
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
    
    // Different actions based on request
    switch (action) {
      case 'getUsers':
        // Verify admin credentials
        if (!payload.adminToken) {
          return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Unauthorized' }) };
        }
        
        // Return all users
        const db = readUserDB();
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, users: db.users }) 
        };
        
      case 'addUser':
        // Add a new user to the database
        const dbForAdd = readUserDB();
        
        // Check if email already exists
        if (dbForAdd.users.some(u => u.email.toLowerCase() === payload.user.email.toLowerCase())) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Email already in use' }) 
          };
        }
        
        // Add the user and save
        dbForAdd.users.push(payload.user);
        writeUserDB(dbForAdd);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User added successfully' }) 
        };
        
      case 'updateUser':
        // Update an existing user
        const dbForUpdate = readUserDB();
        const userIndex = dbForUpdate.users.findIndex(u => u.uid === payload.user.uid);
        
        if (userIndex === -1) {
          return { 
            statusCode: 404, 
            body: JSON.stringify({ success: false, message: 'User not found' }) 
          };
        }
        
        // Update user and save
        dbForUpdate.users[userIndex] = payload.user;
        writeUserDB(dbForUpdate);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User updated successfully' }) 
        };
        
      case 'deleteUser':
        // Delete a user
        // Require admin token for this action
        if (!payload.adminToken) {
          return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Unauthorized' }) };
        }
        
        const dbForDelete = readUserDB();
        dbForDelete.users = dbForDelete.users.filter(u => u.uid !== payload.uid);
        writeUserDB(dbForDelete);
        
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
      body: JSON.stringify({ success: false, message: 'Server error', error: error.message }) 
    };
  }
};