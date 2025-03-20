// netlify/functions/user-management.js
const { getStore } = require('@netlify/blobs');

// Helper to read the user database
async function readUserDB() {
  const store = getStore("users");
  try {
    const data = await store.get("userdb");
    return data ? JSON.parse(data) : { users: [] };
  } catch (error) {
    console.error('Error reading user database:', error);
    return { users: [] };
  }
}

// Helper to write to the user database
async function writeUserDB(data) {
  const store = getStore("users");
  try {
    await store.set("userdb", JSON.stringify(data));
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
        // Return all users
        const db = await readUserDB();
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, users: db.users }) 
        };
        
      case 'addUser':
        // Add a new user to the database
        const dbForAdd = await readUserDB();
        
        // Check if email already exists
        if (dbForAdd.users.some(u => u.email.toLowerCase() === payload.user.email.toLowerCase())) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Email already in use' }) 
          };
        }
        
        // Add the user and save
        dbForAdd.users.push(payload.user);
        await writeUserDB(dbForAdd);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User added successfully' }) 
        };
        
      case 'updateUser':
        // Update an existing user
        const dbForUpdate = await readUserDB();
        const userIndex = dbForUpdate.users.findIndex(u => u.uid === payload.user.uid);
        
        if (userIndex === -1) {
          return { 
            statusCode: 404, 
            body: JSON.stringify({ success: false, message: 'User not found' }) 
          };
        }
        
        // Update user and save
        dbForUpdate.users[userIndex] = payload.user;
        await writeUserDB(dbForUpdate);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User updated successfully' }) 
        };
        
      case 'deleteUser':
        // Delete a user
        const dbForDelete = await readUserDB();
        dbForDelete.users = dbForDelete.users.filter(u => u.uid !== payload.uid);
        await writeUserDB(dbForDelete);
        
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