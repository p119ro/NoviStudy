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
    
    // Check if necessary environment variables are set
    if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_API_TOKEN) {
      console.error("Missing required environment variables for Netlify Blobs");
      return { 
        statusCode: 500, 
        body: JSON.stringify({ 
          success: false, 
          message: "Server misconfiguration: Missing Netlify Blobs environment variables."
        })
      };
    }
    
    // Get the users store with explicit configuration
    const usersStore = getStore({
      name: "user-database",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    });
    
    // Different actions based on request
    switch (action) {
      case 'getUsers':
        // Get users from blob store
        const usersData = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, users: usersData.users || [] }) 
        };
        
      case 'addUser':
        // Get existing users
        let dbForAdd = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        if (!dbForAdd.users) dbForAdd.users = [];
        
        // Check if email already exists
        if (dbForAdd.users.some(u => u.email && u.email.toLowerCase() === payload.user.email.toLowerCase())) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Email already in use' }) 
          };
        }
        
        // Check if user with this UID already exists
        if (dbForAdd.users.some(u => u.uid === payload.user.uid)) {
          return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'User ID already exists' }) 
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
        if (!dbForUpdate.users) dbForUpdate.users = [];
        
        const userIndex = dbForUpdate.users.findIndex(u => u.uid === payload.user.uid);
        
        if (userIndex === -1) {
          // User not found - add them instead of returning error
          console.log("User not found in database, adding new user:", payload.user.email);
          dbForUpdate.users.push(payload.user);
          await usersStore.setJSON("users-list", dbForUpdate);
          
          return { 
            statusCode: 200, 
            body: JSON.stringify({ 
              success: true, 
              message: 'User not found in database, created successfully'
            }) 
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
        if (!dbForDelete.users) dbForDelete.users = [];
        
        // Check if user exists before deletion
        if (!dbForDelete.users.some(u => u.uid === payload.uid)) {
          return {
            statusCode: 404,
            body: JSON.stringify({ success: false, message: 'User not found for deletion' })
          };
        }
        
        // Filter out deleted user
        dbForDelete.users = dbForDelete.users.filter(u => u.uid !== payload.uid);
        
        // Save updated list
        await usersStore.setJSON("users-list", dbForDelete);
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ success: true, message: 'User deleted successfully' }) 
        };
        
      case 'syncUsers':
        // Get existing users from the store
        let dbForSync = await usersStore.get("users-list", { type: 'json' }) || { users: [] };
        if (!dbForSync.users) dbForSync.users = [];
        
        // Get the users to sync from the payload
        const { users: usersToSync } = payload;
        
        if (!usersToSync || !Array.isArray(usersToSync)) {
          return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: 'Invalid users data for sync' })
          };
        }
        
        // Compare and merge users
        for (const user of usersToSync) {
          const existingUserIndex = dbForSync.users.findIndex(u => u.uid === user.uid);
          
          if (existingUserIndex === -1) {
            // Add new user
            dbForSync.users.push(user);
          } else {
            // Update existing user - merge with priority to new data
            dbForSync.users[existingUserIndex] = {
              ...dbForSync.users[existingUserIndex],
              ...user
            };
          }
        }
        
        // Save merged users back to the store
        await usersStore.setJSON("users-list", dbForSync);
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: `Synced ${usersToSync.length} users successfully`,
            userCount: dbForSync.users.length
          })
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