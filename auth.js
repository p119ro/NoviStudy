// auth.js - Simplified Authentication for QuickStudy using localStorage and Netlify Functions
(function() {
    // Variables to track state
    let currentUser = null;
    let users = []; // Array to store all users
    
    // Configuration - hardcoded values moved to Netlify environment variables
    const config = {
        appName: 'NoviStudy',
        verificationExpiryHours: 24
    };
    
    // Public API for other scripts to use
    window.QuickStudyAuth = {
        initialize,
        getCurrentUser,
        isLoggedIn,
        signOut,
        showLoginScreen,
        isAdmin,
        verifyEmail
    };
    
    /**
     * Initialize Auth System
     */
    function initialize() {
        console.log("Initializing Simple Auth System");
        
        // Load existing users from localStorage
        loadUsers();
        
        // Create the login UI
        createLoginUI();
        
        // Check if a user was previously logged in
        checkPersistedLogin();
        
        console.log("Auth system initialized successfully");
    }
    
    /**
     * Load users from localStorage
     */
    function loadUsers() {
        const savedUsers = localStorage.getItem('quickstudy_users');
        if (savedUsers) {
            users = JSON.parse(savedUsers);
            console.log(`Loaded ${users.length} users from storage`);
        } else {
            // Create an empty user array - no default users
            users = [];
            saveUsers();
            console.log("No existing users found");
        }
    }
    
    /**
     * Save users to localStorage
     */
    function saveUsers() {
        localStorage.setItem('quickstudy_users', JSON.stringify(users));
    }
    
    /**
     * Check if there's a persisted login
     */
    function checkPersistedLogin() {
        const savedUser = localStorage.getItem('quickstudy_current_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log("User signed in from persistent storage:", currentUser.email);
            hideLoginScreen();
            showUserInfo(currentUser);
            updateUserLastLogin(currentUser.uid);
            
            // If QuickStudyMemory exists, link it with user data
            if (window.QuickStudyMemory) {
                linkWithQuickStudyMemory();
            }
            
            // Check if user needs verification
            if (!currentUser.isVerified && !currentUser._isAdmin) {
                showVerificationForm();
            }
        } else {
            console.log("No user signed in");
            hideUserInfo();
            showLoginScreen();
        }
    }
    
    /**
     * Check admin status securely via server function
     * @param {string} username - Username to check
     * @param {string} password - Password to check
     * @returns {Promise<boolean>} - True if admin credentials are valid
     */
    async function checkAdminCredentials(username, password) {
        try {
            const response = await fetch('/.netlify/functions/verify-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            return data.isAdmin === true;
        } catch (error) {
            console.error("Error verifying admin credentials:", error);
            return false;
        }
    }
    
    /**
     * Send verification email using Netlify Function
     * @param {Object} params - Email parameters
     * @param {string} params.to - Recipient email
     * @param {string} params.name - Recipient name
     * @param {string} params.code - Verification code
     * @param {function} callback - Callback function(success, errorMsg)
     */
    function sendVerificationEmailViaNetlify(params, callback) {
        console.log("Sending verification email via Netlify Function");
        
        fetch('/.netlify/functions/send-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: params.to,
                name: params.name,
                code: params.code
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Email function response:", data);
            if (data.success) {
                callback(true);
            } else {
                callback(false, data.message || "Unknown error");
            }
        })
        .catch(error => {
            console.error("Error calling email function:", error);
            callback(false, error.message);
        });
    }
    
    /**
     * Get current user
     */
    function getCurrentUser() {
        return currentUser;
    }
    
    /**
     * Check if user is logged in
     */
    function isLoggedIn() {
        return !!currentUser;
    }
    
    /**
     * Check if current user is admin
     */
    function isAdmin() {
        return currentUser && currentUser._isAdmin === true;
    }
    
    /**
     * Sign out current user
     */
    function signOut() {
        currentUser = null;
        localStorage.removeItem('quickstudy_current_user');
        console.log("User signed out successfully");
        hideUserInfo();
        hideVerificationForm();
        showLoginScreen();
    }
    
    /**
     * Create the login UI
     */
    function createLoginUI() {
        // Add styles
        addStyles();
        
        // Create login container if it doesn't exist
        if (!document.getElementById("qs-auth-container")) {
            const loginHTML = `
                <div id="qs-auth-container" class="qs-auth-container">
                    <div class="qs-auth-overlay"></div>
                    <div class="qs-auth-modal">
                        <div class="qs-auth-logo">
                            <h1>${config.appName}</h1>
                            <p>Study smarter, not harder</p>
                        </div>
                        
                        <div class="qs-auth-tabs">
                            <button id="qs-login-tab" class="qs-auth-tab active">Log In</button>
                            <button id="qs-signup-tab" class="qs-auth-tab">Sign Up</button>
                            <button id="qs-admin-tab" class="qs-auth-tab hidden">Admin Panel</button>
                        </div>
                        
                        <div class="qs-auth-content">
                            <!-- Login Form -->
                            <form id="qs-login-form" class="qs-auth-form active">
                                <div id="qs-login-error" class="qs-auth-error"></div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-login-email">Username / Email</label>
                                    <input type="text" id="qs-login-email" placeholder="Your email or username" required>
                                </div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-login-password">Password</label>
                                    <input type="password" id="qs-login-password" placeholder="Your password" required>
                                </div>
                                
                                <button type="submit" id="qs-login-button" class="qs-auth-button">Log In</button>
                                
                                <div class="qs-auth-links">
                                    <a href="#" id="qs-forgot-password">Forgot password?</a>
                                </div>
                            </form>
                            
                            <!-- Signup Form -->
                            <form id="qs-signup-form" class="qs-auth-form">
                                <div id="qs-signup-error" class="qs-auth-error"></div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-signup-name">Full Name</label>
                                    <input type="text" id="qs-signup-name" placeholder="Your name" required>
                                </div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-signup-email">Email</label>
                                    <input type="email" id="qs-signup-email" placeholder="Your email" required>
                                </div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-signup-password">Password</label>
                                    <input type="password" id="qs-signup-password" placeholder="Create a password (at least 6 characters)" required>
                                    <div id="qs-password-strength" class="qs-password-strength"></div>
                                </div>
                                
                                <button type="submit" id="qs-signup-button" class="qs-auth-button">Create Account</button>
                            </form>
                            
                            <!-- Reset Password Form -->
                            <form id="qs-reset-form" class="qs-auth-form">
                                <div id="qs-reset-message" class="qs-auth-message"></div>
                                
                                <p class="qs-reset-info">Enter your email address to reset your password.</p>
                                
                                <div class="qs-input-group">
                                    <label for="qs-reset-email">Email</label>
                                    <input type="email" id="qs-reset-email" placeholder="Your email" required>
                                </div>
                                
                                <button type="submit" id="qs-reset-button" class="qs-auth-button">Reset Password</button>
                                
                                <div class="qs-auth-links">
                                    <a href="#" id="qs-back-to-login">Back to login</a>
                                </div>
                            </form>
                            
                            <!-- Admin Panel -->
                            <div id="qs-admin-panel" class="qs-auth-form">
                                <h3>Admin Dashboard</h3>
                                <div class="qs-admin-note">Welcome to the admin dashboard. You can manage all users here.</div>
                                
                                <div class="qs-admin-controls">
                                    <button id="qs-refresh-users" class="qs-admin-button">Refresh User List</button>
                                    <button id="qs-export-users" class="qs-admin-button">Export Users to CSV</button>
                                </div>
                                
                                <div class="qs-admin-section">
                                    <h4>Registered Users</h4>
                                    <div id="qs-user-list" class="qs-user-list">
                                        <!-- User list will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Email Verification Form -->
                <div id="qs-verification-container" class="qs-verification-container">
                    <div class="qs-auth-overlay"></div>
                    <div class="qs-auth-modal">
                        <div class="qs-auth-logo">
                            <h1>${config.appName}</h1>
                            <p>Email Verification</p>
                        </div>
                        
                        <div class="qs-auth-content">
                            <form id="qs-verification-form" class="qs-auth-form active">
                                <div id="qs-verification-error" class="qs-auth-error"></div>
                                <div id="qs-verification-message" class="qs-auth-message"></div>
                                
                                <p class="qs-verification-info">
                                    We've sent a verification code to your email. 
                                    Please enter the code below to verify your account.
                                </p>
                                
                                <div class="qs-input-group">
                                    <label for="qs-verification-code">Verification Code</label>
                                    <input type="text" id="qs-verification-code" placeholder="Enter 6-digit code" required>
                                </div>
                                
                                <button type="submit" id="qs-verify-button" class="qs-auth-button">Verify Email</button>
                                
                                <div class="qs-auth-links">
                                    <a href="#" id="qs-resend-code">Resend Code</a>
                                    <span class="qs-link-separator">|</span>
                                    <a href="#" id="qs-skip-verification">Skip for now</a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div id="qs-user-panel" class="qs-user-panel">
                    <div class="qs-user-info">
                        <div class="qs-user-avatar">
                            <img id="qs-user-avatar" src="" alt="User">
                        </div>
                        <div class="qs-user-details">
                            <span id="qs-user-name"></span>
                        </div>
                        <div id="qs-verification-status" class="qs-verification-status hidden">
                            <span class="qs-verification-badge">Unverified</span>
                        </div>
                        <div id="qs-admin-button-container" class="qs-admin-button-container hidden">
                            <button id="qs-admin-dashboard-button" class="qs-admin-dashboard-button">
                                Admin
                            </button>
                        </div>
                        <button id="qs-logout-button" class="qs-logout-button">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            const div = document.createElement("div");
            div.innerHTML = loginHTML;
            // Append all children properly
            const elements = Array.from(div.children);
            elements.forEach(element => {
                document.body.appendChild(element);
            });
            
            // Add event listeners
            addEventListeners();
        }
    }
    

    function ensureVerificationFormExists() {
        if (document.getElementById("qs-verification-container")) {
            return; // Already exists
        }
        
        console.log("Creating verification form");
        
        // Create just the verification form
        const verificationHTML = `
            <div id="qs-verification-container" class="qs-verification-container">
                <div class="qs-auth-overlay"></div>
                <div class="qs-auth-modal">
                    <div class="qs-auth-logo">
                        <h1>${config.appName}</h1>
                        <p>Email Verification</p>
                    </div>
                    
                    <div class="qs-auth-content">
                        <form id="qs-verification-form" class="qs-auth-form active">
                            <div id="qs-verification-error" class="qs-auth-error"></div>
                            <div id="qs-verification-message" class="qs-auth-message"></div>
                            
                            <p class="qs-verification-info">
                                We've sent a verification code to your email. 
                                Please enter the code below to verify your account.
                            </p>
                            
                            <div class="qs-input-group">
                                <label for="qs-verification-code">Verification Code</label>
                                <input type="text" id="qs-verification-code" placeholder="Enter 6-digit code" required>
                            </div>
                            
                            <button type="submit" id="qs-verify-button" class="qs-auth-button">Verify Email</button>
                            
                            <div class="qs-auth-links">
                                <a href="#" id="qs-resend-code">Resend Code</a>
                                <span class="qs-link-separator">|</span>
                                <a href="#" id="qs-skip-verification">Skip for now</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = verificationHTML;
        document.body.appendChild(tempDiv.firstElementChild);
        
        // Attach verification form event listeners
        document.getElementById("qs-verification-form").addEventListener("submit", (e) => {
            e.preventDefault();
            handleVerification();
        });
        
        document.getElementById("qs-resend-code").addEventListener("click", (e) => {
            e.preventDefault();
            resendVerificationCode();
        });
        
        document.getElementById("qs-skip-verification").addEventListener("click", (e) => {
            e.preventDefault();
            if (isAdmin()) {
                hideVerificationForm();
                console.log("Admin override: Verification skipped");
            } else {
                showError("verification", "Email verification is required to use this application.");
            }
        });
    }

    /**
     * Add event listeners to authentication forms
     */
    function addEventListeners() {
        // Tab switching
        document.getElementById("qs-login-tab").addEventListener("click", () => {
            switchTab("login");
        });
        
        document.getElementById("qs-signup-tab").addEventListener("click", () => {
            switchTab("signup");
        });
        
        document.getElementById("qs-admin-tab").addEventListener("click", () => {
            if (isAdmin()) {
                switchTab("admin");
                updateAdminPanel();
            }
        });
        
        // Login form
        document.getElementById("qs-login-form").addEventListener("submit", (e) => {
            e.preventDefault();
            handleLogin();
        });
        
        // Signup form
        document.getElementById("qs-signup-form").addEventListener("submit", (e) => {
            e.preventDefault();
            handleSignup();
        });
        
        // Reset password form
        document.getElementById("qs-reset-form").addEventListener("submit", (e) => {
            e.preventDefault();
            handlePasswordReset();
        });
        
        // Verification form
        document.getElementById("qs-verification-form").addEventListener("submit", (e) => {
            e.preventDefault();
            handleVerification();
        });
        
        // Verification links
        document.getElementById("qs-resend-code").addEventListener("click", (e) => {
            e.preventDefault();
            resendVerificationCode();
        });
        
        document.getElementById("qs-skip-verification").addEventListener("click", (e) => {
            e.preventDefault();
            
            // Prevent skipping unless this is an admin account
            if (isAdmin()) {
                hideVerificationForm();
                console.log("Admin override: Verification skipped");
            } else {
                showError("verification", "Email verification is required to use this application.");
            }
        });
        
        // Password reset links
        document.getElementById("qs-forgot-password").addEventListener("click", (e) => {
            e.preventDefault();
            showResetForm();
        });
        
        document.getElementById("qs-back-to-login").addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("login");
        });
        
        // Admin panel buttons
        const refreshUsersBtn = document.getElementById("qs-refresh-users");
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener("click", updateAdminPanel);
        }
        
        const exportUsersBtn = document.getElementById("qs-export-users");
        if (exportUsersBtn) {
            exportUsersBtn.addEventListener("click", exportUsersToCSV);
        }
        
        // Admin dashboard button in user panel
        const adminDashboardBtn = document.getElementById("qs-admin-dashboard-button");
        if (adminDashboardBtn) {
            adminDashboardBtn.addEventListener("click", openAdminDashboard);
        }
        
        // Logout button
        document.getElementById("qs-logout-button").addEventListener("click", signOut);
        
        // Password strength meter
        const passwordInput = document.getElementById("qs-signup-password");
        if (passwordInput) {
            passwordInput.addEventListener("input", updatePasswordStrength);
        }
    }
    
    /**
     * Switch between login/signup tabs
     */
    function switchTab(tab) {
        // Update tab buttons
        document.getElementById("qs-login-tab").classList.toggle("active", tab === "login");
        document.getElementById("qs-signup-tab").classList.toggle("active", tab === "signup");
        
        const adminTab = document.getElementById("qs-admin-tab");
        if (adminTab) {
            adminTab.classList.toggle("active", tab === "admin");
        }
        
        // Hide all forms
        document.querySelectorAll(".qs-auth-form").forEach(form => {
            form.classList.remove("active");
        });
        
        // Show the selected form
        let formId;
        switch (tab) {
            case "signup":
                formId = "qs-signup-form";
                break;
            case "reset":
                formId = "qs-reset-form";
                break;
            case "admin":
                formId = "qs-admin-panel";
                updateAdminPanel();
                break;
            default:
                formId = "qs-login-form";
        }
        
        document.getElementById(formId).classList.add("active");
        
        // Clear error messages
        clearErrors();
    }
    
    /**
     * Update the admin panel with user data
     */
    function updateAdminPanel() {
        if (!isAdmin()) return;
        
        const userList = document.getElementById("qs-user-list");
        if (!userList) return;
        
        // Clear existing content
        userList.innerHTML = '';
        
        // Display all users
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'qs-user-item';
            
            userItem.innerHTML = `
                <div class="qs-user-email">${user.email}</div>
                <div class="qs-user-password">Password: ${user.password}</div>
                <div class="qs-user-name">Name: ${user.displayName || 'Not set'}</div>
                <div class="qs-user-created">Created: ${new Date(user.createdAt).toLocaleString()}</div>
                <div class="qs-user-lastlogin">Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
                <div class="qs-user-verification">
                    Verification: 
                    <span class="qs-verification-status-${user.isVerified ? 'verified' : 'unverified'}">
                        ${user.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    ${user.verificationCode ? `(Code: ${user.verificationCode})` : ''}
                </div>
                <div class="qs-user-actions">
                    <button class="qs-delete-user" data-uid="${user.uid}">Delete</button>
                    <button class="qs-reset-user-pwd" data-uid="${user.uid}">Reset Password</button>
                    ${!user.isVerified ? `<button class="qs-verify-user" data-uid="${user.uid}">Verify User</button>` : ''}
                </div>
            `;
            
            userList.appendChild(userItem);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.qs-delete-user').forEach(button => {
            button.addEventListener('click', function() {
                const uid = this.getAttribute('data-uid');
                if (confirm("Are you sure you want to delete this user?")) {
                    deleteUser(uid);
                    updateAdminPanel();
                }
            });
        });
        
        document.querySelectorAll('.qs-reset-user-pwd').forEach(button => {
            button.addEventListener('click', function() {
                const uid = this.getAttribute('data-uid');
                resetUserPassword(uid);
                updateAdminPanel();
            });
        });
        
        document.querySelectorAll('.qs-verify-user').forEach(button => {
            button.addEventListener('click', function() {
                const uid = this.getAttribute('data-uid');
                verifyUserManually(uid);
                updateAdminPanel();
            });
        });
    }
    
    /**
     * Delete a user by UID
     */
    function deleteUser(uid) {
        users = users.filter(user => user.uid !== uid);
        saveUsers();
    }
    
    /**
     * Reset a user's password to default
     */
    function resetUserPassword(uid) {
        const userIndex = users.findIndex(user => user.uid === uid);
        if (userIndex !== -1) {
            const defaultPassword = "password123";
            users[userIndex].password = defaultPassword;
            saveUsers();
            
            // Send password reset email using Netlify function
            fetch('/.netlify/functions/send-password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: users[userIndex].email,
                    name: users[userIndex].displayName || '',
                    password: defaultPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`Password reset email sent to ${users[userIndex].email}`);
                } else {
                    alert(`Password reset to "${defaultPassword}" for user: ${users[userIndex].email}, but email could not be sent. Error: ${data.message}`);
                }
            })
            .catch(error => {
                console.error("Error sending password reset email:", error);
                alert(`Password reset to "${defaultPassword}" for user: ${users[userIndex].email}, but email could not be sent.`);
            });
        }
    }
    
    /**
     * Manually verify a user (admin function)
     */
    function verifyUserManually(uid) {
        const userIndex = users.findIndex(user => user.uid === uid);
        if (userIndex !== -1) {
            users[userIndex].isVerified = true;
            users[userIndex].verificationCode = null;
            saveUsers();
            alert(`User ${users[userIndex].email} has been verified.`);
        }
    }
    
    /**
     * Export users to CSV
     */
    function exportUsersToCSV() {
        if (!isAdmin()) return;
        
        // Convert users to CSV
        const headers = ["Email", "Password", "Name", "Created", "Last Login", "Verified", "Verification Code"];
        const csvRows = [headers.join(',')];
        
        users.forEach(user => {
            const row = [
                user.email,
                user.password,
                user.displayName || '',
                user.createdAt,
                user.lastLogin || '',
                user.isVerified ? 'Yes' : 'No',
                user.verificationCode || ''
            ];
            
            // Escape special characters
            const escapedRow = row.map(field => {
                if (typeof field !== 'string') field = String(field);
                // If the field contains commas, quotes, or newlines, wrap it in quotes
                if (field.includes('"') || field.includes(',') || field.includes('\n')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            });
            
            csvRows.push(escapedRow.join(','));
        });
        
        const csvString = csvRows.join('\n');
        
        // Create a download link
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.appName}_users.csv`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    /**
     * Open admin dashboard
     */
    function openAdminDashboard() {
        if (!isAdmin()) return;
        
        // Show login container with admin panel
        document.getElementById("qs-auth-container").classList.add("visible");
        document.body.classList.add("qs-body-with-auth");
        
        // Switch to admin tab
        switchTab("admin");
    }
    
    /**
     * Show the reset password form
     */
    function showResetForm() {
        // Hide all forms
        document.querySelectorAll(".qs-auth-form").forEach(form => {
            form.classList.remove("active");
        });
        
        // Show reset form
        document.getElementById("qs-reset-form").classList.add("active");
        
        // Clear error messages
        clearErrors();
    }
    
    /**
     * Clear error messages
     */
    function clearErrors() {
        document.querySelectorAll(".qs-auth-error, .qs-auth-message").forEach(el => {
            el.textContent = "";
            el.style.display = "none";
        });
    }
    
    /**
     * Show error message
     */
    function showError(formType, message) {
        const errorElement = document.getElementById(`qs-${formType}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = "block";
        }
    }
    
    /**
     * Show success message
     */
    function showSuccess(formType, message) {
        const messageElement = document.getElementById(`qs-${formType}-message`);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = "qs-auth-message qs-success";
            messageElement.style.display = "block";
        }
    }
    
    /**
     * Handle logi form submission
     */
    async function handleLogin() {
        const identifier = document.getElementById("qs-login-email").value;
        const password = document.getElementById("qs-login-password").value;
        
        if (!identifier || !password) {
            showError("login", "Please enter both email/username and password");
            return;
        }
        
        // Show loading state
        const loginButton = document.getElementById("qs-login-button");
        loginButton.disabled = true;
        loginButton.innerHTML = '<div class="qs-spinner"></div> Logging in...';
        
        try {
            // Check if this is the admin login using secure server function
            const isAdminUser = await checkAdminCredentials(identifier, password);
            
            if (isAdminUser) {
                // Check if admin user exists in the database
                let adminUser = users.find(u => u.email.toLowerCase() === identifier.toLowerCase());
                
                if (!adminUser) {
                    // Create admin user if it doesn't exist
                    adminUser = {
                        uid: generateUid(),
                        email: identifier,
                        password: "●●●●●●●●", // Don't store actual password
                        displayName: "Admin User",
                        photoURL: createDefaultAvatar("Admin"),
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        isVerified: true,
                        isAdmin: true
                    };
                    
                    users.push(adminUser);
                    saveUsers();
                }
                
                // Create a copy with admin flag but without password
                currentUser = { 
                    ...adminUser,
                    _isAdmin: true
                };
                
                // Don't store password in localStorage
                if (currentUser.password === password) {
                    currentUser.password = "●●●●●●●●";
                }
                
                localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
                
                // Update UI to show admin elements
                showAdminUI();
                
                // Update last login
                updateUserLastLogin(adminUser.uid);
                
                // Hide login screen
                hideLoginScreen();
                showUserInfo(currentUser);
                clearErrors();
                console.log("Admin signed in");
            } else {
                // Regular user login - find user with matching email and password
                const user = users.find(u => 
                    (u.email.toLowerCase() === identifier.toLowerCase()) && 
                    u.password === password
                );
                
                if (user) {
                    // Success - set current user and update UI
                    currentUser = { ...user, _isAdmin: false };
                    localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
                    
                    // Update last login
                    updateUserLastLogin(user.uid);
                    
                    // Update UI
                    hideLoginScreen();
                    showUserInfo(currentUser);
                    hideAdminUI();
                    
                    // Check if email needs verification
                    if (!user.isVerified) {
                        console.log("User needs verification, displaying form");
                        // Ensure verification form exists and show it
                        ensureVerificationFormExists();
                        
                        // Small timeout to allow UI to update
                        setTimeout(() => {
                            showVerificationForm();
                        }, 100);
                    }
                    
                    clearErrors();
                    console.log("User signed in:", currentUser.email);
                } else {
                    console.error("Login error: Invalid credentials");
                    showError("login", "Invalid email or password");
                }
            }
        } catch (error) {
            console.error("Login error:", error);
            showError("login", "Error during login. Please try again.");
        } finally {
            // Reset button
            loginButton.disabled = false;
            loginButton.innerHTML = "Log In";
        }
    }
    
    /**
     * Show admin UI elements
     */
    function showAdminUI() {
        // Show admin tab
        const adminTab = document.getElementById("qs-admin-tab");
        if (adminTab) {
            adminTab.classList.remove("hidden");
        }
        
        // Show admin dashboard button in user panel
        const adminButtonContainer = document.getElementById("qs-admin-button-container");
        if (adminButtonContainer) {
            adminButtonContainer.classList.remove("hidden");
        }
    }
    
    /**
     * Hide admin UI elements
     */
    function hideAdminUI() {
        // Hide admin tab
        const adminTab = document.getElementById("qs-admin-tab");
        if (adminTab) {
            adminTab.classList.add("hidden");
        }
        
        // Hide admin dashboard button in user panel
        const adminButtonContainer = document.getElementById("qs-admin-button-container");
        if (adminButtonContainer) {
            adminButtonContainer.classList.add("hidden");
        }
    }
    
    /**
     * Show verification form
     */
    function showVerificationForm() {
        if (!currentUser || currentUser._isAdmin) return;
        
        console.log("Showing verification form");
        
        // Ensure verification form exists in DOM
        ensureVerificationFormExists();
        
        // Generate verification code if needed
        if (!currentUser.verificationCode) {
            generateAndSendVerificationCode();
        }
        
        // Show verification badge in user panel
        const verificationStatus = document.getElementById("qs-verification-status");
        if (verificationStatus) {
            verificationStatus.classList.remove("hidden");
        }
        
        // Show verification form
        const verificationContainer = document.getElementById("qs-verification-container");
        if (verificationContainer) {
            verificationContainer.classList.add("visible");
            document.body.classList.add("qs-body-with-verification");
            console.log("Verification form displayed");
        } else {
            console.error("Verification container not found even after creation attempt");
        }
    }
    
    /**
     * Hide verification form
     */
    function hideVerificationForm() {
        const verificationContainer = document.getElementById("qs-verification-container");
        if (verificationContainer) {
            verificationContainer.classList.remove("visible");
            document.body.classList.remove("qs-body-with-verification");
        }
    }
    
    /**
     * Generate and send verification code
     */
    function generateAndSendVerificationCode() {
        if (!currentUser) return;
        
        // Generate a random 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update user's verification code
        const userIndex = users.findIndex(u => u.uid === currentUser.uid);
        if (userIndex !== -1) {
            users[userIndex].verificationCode = verificationCode;
            currentUser.verificationCode = verificationCode;
            
            // Save changes
            saveUsers();
            localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
            
            // Send verification email using Netlify function
            sendVerificationEmailViaNetlify({
                to: currentUser.email,
                name: currentUser.displayName || '',
                code: verificationCode
            }, function(success, error) {
                if (success) {
                    console.log("Verification email sent successfully");
                    showSuccess("verification", "Verification code has been sent to your email");
                } else {
                    console.error("Error sending verification email:", error);
                    
                    // Only show code to admin for testing if all methods fail
                    if (isAdmin()) {
                        console.log("Admin testing - verification code:", verificationCode);
                        showError("verification", "Email services unavailable (admin mode). See console for code.");
                    } else {
                        showError("verification", "Email verification service is unavailable. Please try again later.");
                    }
                }
            });
        }
    }
    
    /**
     * Resend verification code
     */
    function resendVerificationCode() {
        if (!currentUser) return;
        
        // Clear any previous success/error messages
        clearErrors();
        
        // Show loading state
        const resendLink = document.getElementById("qs-resend-code");
        if (resendLink) {
            resendLink.textContent = "Sending...";
            resendLink.style.pointerEvents = "none";
        }
        
        // Generate and send the code
        generateAndSendVerificationCode();
        
        // Reset the button after delay
        setTimeout(() => {
            if (resendLink) {
                resendLink.textContent = "Resend Code";
                resendLink.style.pointerEvents = "auto";
            }
        }, 3000);
    }
    
    /**
     * Handle verification code submission
     */
    function handleVerification() {
        const code = document.getElementById("qs-verification-code").value;
        
        if (!code) {
            showError("verification", "Please enter the verification code");
            return;
        }
        
        // Show loading state
        const verifyButton = document.getElementById("qs-verify-button");
        verifyButton.disabled = true;
        verifyButton.innerHTML = '<div class="qs-spinner"></div> Verifying...';
        
        // Check the code
        if (currentUser && currentUser.verificationCode === code) {
            // Mark user as verified
            const userIndex = users.findIndex(u => u.uid === currentUser.uid);
            if (userIndex !== -1) {
                users[userIndex].isVerified = true;
                users[userIndex].verificationCode = null;
                currentUser.isVerified = true;
                currentUser.verificationCode = null;
                
                // Save changes
                saveUsers();
                localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
                
                // Show success and hide verification form after delay
                showSuccess("verification", "Email verified successfully!");
                
                // Hide verification badge
                const verificationStatus = document.getElementById("qs-verification-status");
                if (verificationStatus) {
                    verificationStatus.classList.add("hidden");
                }
                
                setTimeout(() => {
                    hideVerificationForm();
                }, 2000);
            }
        } else {
            showError("verification", "Invalid verification code. Please try again.");
        }
        
        // Reset button
        verifyButton.disabled = false;
        verifyButton.innerHTML = "Verify Email";
    }
    
    /**
     * Verify email with code (public method)
     */
    function verifyEmail(code) {
        if (!currentUser || currentUser.isVerified) return false;
        
        if (currentUser.verificationCode === code) {
            // Mark user as verified
            const userIndex = users.findIndex(u => u.uid === currentUser.uid);
            if (userIndex !== -1) {
                users[userIndex].isVerified = true;
                users[userIndex].verificationCode = null;
                currentUser.isVerified = true;
                currentUser.verificationCode = null;
                
                // Save changes
                saveUsers();
                localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
                
                // Hide verification badge
                const verificationStatus = document.getElementById("qs-verification-status");
                if (verificationStatus) {
                    verificationStatus.classList.add("hidden");
                }
                
                // Hide form if visible
                hideVerificationForm();
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle signup form submission
     */
    function handleSignup() {
        const name = document.getElementById("qs-signup-name").value;
        const email = document.getElementById("qs-signup-email").value;
        const password = document.getElementById("qs-signup-password").value;
        
        if (!name || !email || !password) {
            showError("signup", "Please fill in all fields");
            return;
        }
        
        if (password.length < 6) {
            showError("signup", "Password must be at least 6 characters");
            return;
        }
        
        // Check if email already in use
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            showError("signup", "Email is already in use");
            return;
        }
        
        // Show loading state
        const signupButton = document.getElementById("qs-signup-button");
        signupButton.disabled = true;
        signupButton.innerHTML = '<div class="qs-spinner"></div> Creating account...';
        
        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Create new user
        const newUser = {
            uid: generateUid(),
            email: email,
            password: password,
            displayName: name,
            photoURL: createDefaultAvatar(name),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isVerified: false,
            verificationCode: verificationCode
        };
        
        // Add to users array and save
        users.push(newUser);
        saveUsers();
        
        // Set as current user
        currentUser = { ...newUser, _isAdmin: false };
        localStorage.setItem('quickstudy_current_user', JSON.stringify(currentUser));
        
        // Clear previous errors
        clearErrors();
        
        // Send verification email using Netlify Function
        sendVerificationEmailViaNetlify({
            to: email,
            name: name,
            code: verificationCode
        }, function(success, error) {
            // Complete signup regardless of email success
            completeSignup();
            
            if (success) {
                console.log("Verification email sent successfully");
                // Show success message with slight delay
                setTimeout(() => {
                    showSuccess("verification", "Verification code has been sent to your email");
                }, 300);
            } else {
                console.error("Error sending verification email:", error);
                
                // Show appropriate error message after form is visible
                setTimeout(() => {
                    // Only show code to admin for testing
                    if (isAdmin()) {
                        console.log("Admin testing - verification code:", verificationCode);
                        showError("verification", "Email services unavailable (admin mode). See console for code.");
                    } else {
                        showError("verification", "Email verification service is currently unavailable. Please try again later.");
                    }
                }, 300);
            }
        });
        
        // Helper function to complete the signup process
        function completeSignup() {
            // Update UI
            hideLoginScreen();
            showUserInfo(currentUser);
            hideAdminUI();
            
            // Show verification form
            showVerificationForm();
            
            console.log("New user created:", newUser.email);
            
            // Reset button state
            signupButton.disabled = false;
            signupButton.innerHTML = "Create Account";
        }
    }
    
    /**
     * Handle password reset
     */
    function handlePasswordReset() {
        const email = document.getElementById("qs-reset-email").value;
        
        if (!email) {
            showError("reset", "Please enter your email address");
            return;
        }
        
        // Show loading state
        const resetButton = document.getElementById("qs-reset-button");
        resetButton.disabled = true;
        resetButton.innerHTML = '<div class="qs-spinner"></div> Resetting...';
        
        // Find user with matching email
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (userIndex !== -1) {
            // Reset password to a simple default
            const defaultPassword = "password123";
            users[userIndex].password = defaultPassword;
            
            // Save users
            saveUsers();
            
            // Send password reset email using Netlify function
            fetch('/.netlify/functions/send-password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    name: users[userIndex].displayName || '',
                    password: defaultPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    showSuccess("reset", `Password has been reset. Check your email for the new password.`);
                } else {
                    console.error("Error sending password reset email:", data.message);
                    
                    // Show fallback message with password if email sending fails
                    showSuccess("reset", `Password has been reset to: ${defaultPassword}`);
                }
                
                // Automatically return to login after a delay
                setTimeout(() => {
                    switchTab("login");
                }, 3000);
            })
            .catch(error => {
                console.error("Error sending password reset email:", error);
                
                // Fallback if email service is not available
                showSuccess("reset", `Password has been reset to: ${defaultPassword}`);
                
                // Automatically return to login after a delay
                setTimeout(() => {
                    switchTab("login");
                }, 3000);
            });
            
            console.log(`Password reset for user: ${email}`);
        } else {
            showError("reset", "No account found with this email address");
        }
        
        // Reset button
        resetButton.disabled = false;
        resetButton.innerHTML = "Reset Password";
    }
    
    /**
     * Update password strength indicator
     */
    function updatePasswordStrength() {
        const password = document.getElementById("qs-signup-password").value;
        const strengthElement = document.getElementById("qs-password-strength");
        
        if (!password) {
            strengthElement.innerHTML = "";
            return;
        }
        
        // Calculate strength score
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        
        // Character type checks
        if (/[a-z]/.test(password)) strength += 1; // lowercase
        if (/[A-Z]/.test(password)) strength += 1; // uppercase
        if (/[0-9]/.test(password)) strength += 1; // numbers
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1; // special chars
        
        // Determine display based on strength
        let strengthText, strengthClass;
        
        if (strength <= 2) {
            strengthText = "Weak";
            strengthClass = "weak";
        } else if (strength <= 4) {
            strengthText = "Medium";
            strengthClass = "medium";
        } else {
            strengthText = "Strong";
            strengthClass = "strong";
        }
        
        // Update strength display
        strengthElement.innerHTML = `
            <div class="qs-strength-meter">
                <div class="qs-strength-bar ${strengthClass}" style="width: ${(strength / 6) * 100}%"></div>
            </div>
            <div class="qs-strength-text ${strengthClass}">${strengthText}</div>
        `;
    }
    
    /**
     * Show login screen
     */
    function showLoginScreen() {
        const loginContainer = document.getElementById("qs-auth-container");
        if (loginContainer) {
            loginContainer.classList.add("visible");
            document.body.classList.add("qs-body-with-auth");
        }
    }
    
    /**
     * Hide login screen
     */
    function hideLoginScreen() {
        const loginContainer = document.getElementById("qs-auth-container");
        if (loginContainer) {
            loginContainer.classList.remove("visible");
            document.body.classList.remove("qs-body-with-auth");
        }
    }
    
    /**
     * Show user info
     */
    function showUserInfo(user) {
        const userPanel = document.getElementById("qs-user-panel");
        const userName = document.getElementById("qs-user-name");
        const userAvatar = document.getElementById("qs-user-avatar");
        const verificationStatus = document.getElementById("qs-verification-status");
        
        if (userPanel && userName && userAvatar) {
            userName.textContent = user.displayName || user.email;
            userAvatar.src = user.photoURL || createDefaultAvatar(user.displayName || user.email);
            userPanel.classList.add("visible");
            
            // Show verification status if not verified and not admin
            if (verificationStatus && !user.isVerified && !user._isAdmin) {
                verificationStatus.classList.remove("hidden");
            } else if (verificationStatus) {
                verificationStatus.classList.add("hidden");
            }
            
            // Show admin UI if user is admin
            if (isAdmin()) {
                showAdminUI();
            } else {
                hideAdminUI();
            }
        }
    }
    
    /**
     * Hide user info
     */
    function hideUserInfo() {
        const userPanel = document.getElementById("qs-user-panel");
        if (userPanel) {
            userPanel.classList.remove("visible");
        }
    }
    
    /**
     * Create a default avatar for users without profile pictures
     */
    function createDefaultAvatar(name) {
        // Create a data URL for a colored circle with initials
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const size = 100;
        
        canvas.width = size;
        canvas.height = size;
        
        // Generate a color based on the name
        const colors = [
            "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6",
            "#16a085", "#d35400", "#8e44ad", "#2c3e50", "#c0392b"
        ];
        
        // Create a deterministic index from the name
        let hashCode = 0;
        for (let i = 0; i < name.length; i++) {
            hashCode = name.charCodeAt(i) + ((hashCode << 5) - hashCode);
        }
        const colorIndex = Math.abs(hashCode) % colors.length;
        const color = colors[colorIndex];
        
        // Draw background circle
        context.fillStyle = color;
        context.beginPath();
        context.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
        context.fill();
        
        // Draw text
        const initials = getInitials(name);
        context.font = "bold 40px Arial";
        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(initials, size/2, size/2);
        
        return canvas.toDataURL("image/png");
    }
    
    /**
     * Get initials from a name
     */
    function getInitials(name) {
        if (!name) return "?";
        
        const parts = name.toUpperCase().split(/[ @]+/);
        if (parts.length === 1) {
            return parts[0].charAt(0);
        } else {
            return parts[0].charAt(0) + parts[1].charAt(0);
        }
    }
    
    /**
     * Generate a unique identifier for users
     */
    function generateUid() {
        // Simple UUID v4 implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Update user's last login timestamp
     */
    function updateUserLastLogin(userId) {
        const userIndex = users.findIndex(user => user.uid === userId);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            saveUsers();
        }
    }
    
    /**
     * Link with QuickStudyMemory for saving progress
     */
    function linkWithQuickStudyMemory() {
        if (!window.QuickStudyMemory || !currentUser) return;
        
        // Extend the original saveProgress function to also save with user
        const originalSaveProgress = window.QuickStudyMemory.saveProgress;
        
        window.QuickStudyMemory.saveProgress = function(state, presetId) {
            // Call original function first
            const result = originalSaveProgress.apply(this, arguments);
            
            // If user is logged in, save with user ID
            if (currentUser) {
                const userProgressKey = `quickstudy_progress_${currentUser.uid}_${presetId}`;
                localStorage.setItem(userProgressKey, JSON.stringify({
                    currentQuestionIndex: state.currentQuestionIndex,
                    correctAnswers: state.correctAnswers,
                    incorrectAnswers: state.incorrectAnswers,
                    totalTime: state.totalTime,
                    updatedAt: new Date().toISOString()
                }));
            }
            
            return result;
        };
        
        // Add user-specific progress loading
        const originalLoadProgress = window.QuickStudyMemory.loadProgress;
        
        window.QuickStudyMemory.loadProgress = function(presetId) {
            // First try to load from local storage
            const localProgress = originalLoadProgress.apply(this, arguments);
            
            // If user is logged in, check for user-specific progress
            if (currentUser) {
                const userProgressKey = `quickstudy_progress_${currentUser.uid}_${presetId}`;
                const savedProgress = localStorage.getItem(userProgressKey);
                
                if (savedProgress) {
                    const userProgress = JSON.parse(savedProgress);
                    
                    // If there's no local progress or user progress is newer, use user progress
                    if (!localProgress || (userProgress.updatedAt > localProgress.timestamp)) {
                        console.log("Using user-specific progress for", presetId);
                        // This is just a placeholder - you'll need to implement proper progress restoration
                        return userProgress;
                    }
                }
            }
            
            return localProgress;
        };
    }
    
    /**
     * Add styles to the page
     */
    function addStyles() {
        if (document.getElementById("qs-auth-styles")) return;
        
        const styleEl = document.createElement("style");
        styleEl.id = "qs-auth-styles";
        styleEl.textContent = `
            /* QuickStudy Auth Styles */
            
            /* Auth container */
            .qs-auth-container, .qs-verification-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .qs-auth-container.visible, .qs-verification-container.visible {
                opacity: 1;
                visibility: visible;
            }
            
            .qs-body-with-auth, .qs-body-with-verification {
                overflow: hidden;
            }
            
            /* Overlay */
            .qs-auth-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(5px);
            }
            
            /* Auth modal */
            .qs-auth-modal {
                position: relative;
                z-index: 1;
                width: 90%;
                max-width: 420px;
                background-color: #fff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
                animation: qs-slide-up 0.4s ease;
            }
            
            @keyframes qs-slide-up {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            /* Dark mode support */
            .dark-mode .qs-auth-modal {
                background-color: #2c3e50;
                color: #ecf0f1;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            
            /* Logo header */
            .qs-auth-logo {
                padding: 30px 20px;
                text-align: center;
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
            }
            
            .qs-auth-logo h1 {
                margin: 0 0 5px;
                font-size: 2rem;
                font-weight: 700;
            }
            
            .qs-auth-logo p {
                margin: 0;
                opacity: 0.9;
                font-size: 1rem;
            }
            
            /* Tabs */
            .qs-auth-tabs {
                display: flex;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .dark-mode .qs-auth-tabs {
                border-bottom-color: #34495e;
            }
            
            .qs-auth-tab {
                flex: 1;
                padding: 15px;
                text-align: center;
                background: none;
                border: none;
                font-size: 1rem;
                font-weight: 500;
                color: #7f8c8d;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .dark-mode .qs-auth-tab {
                color: #bdc3c7;
            }
            
            .qs-auth-tab.active {
                color: #3498db;
            }
            
            .qs-auth-tab.active::after {
                content: '';
                position: absolute;
                bottom: -1px;
                left: 0;
                width: 100%;
                height: 3px;
                background-color: #3498db;
            }
            
            /* Hidden elements */
            .hidden {
                display: none !important;
            }
            
            /* Forms container */
            .qs-auth-content {
                padding: 25px;
            }
            
            /* Forms */
            .qs-auth-form {
                display: none;
            }
            
            .qs-auth-form.active {
                display: block;
                animation: qs-fade-in 0.3s ease;
            }
            
            @keyframes qs-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Input groups */
            .qs-input-group {
                margin-bottom: 20px;
            }
            
            .qs-input-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                font-size: 0.9rem;
            }
            
            .dark-mode .qs-input-group label {
                color: #ecf0f1;
            }
            
            .qs-input-group input {
                width: 100%;
                padding: 12px 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.2s ease;
            }
            
            .dark-mode .qs-input-group input {
                background-color: #34495e;
                border-color: #546e7a;
                color: #ecf0f1;
            }
            
            .qs-input-group input:focus {
                border-color: #3498db;
                outline: none;
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
            }
            
            .dark-mode .qs-input-group input:focus {
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
            }
            
            /* Buttons */
            .qs-auth-button {
                width: 100%;
                padding: 12px 15px;
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .qs-auth-button:hover {
                background-color: #2980b9;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .dark-mode .qs-auth-button:hover {
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            .qs-auth-button:disabled {
                background-color: #95a5a6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .dark-mode .qs-auth-button:disabled {
                background-color: #546e7a;
            }
            
            /* Links */
            .qs-auth-links {
                text-align: center;
                margin-top: 20px;
            }
            
            .qs-auth-links a {
                color: #3498db;
                text-decoration: none;
                font-size: 0.9rem;
                transition: color 0.2s ease;
            }
            
            .qs-auth-links a:hover {
                color: #2980b9;
                text-decoration: underline;
            }
            
            .dark-mode .qs-auth-links a {
                color: #5dade2;
            }
            
            .dark-mode .qs-auth-links a:hover {
                color: #3498db;
            }
            
            .qs-link-separator {
                margin: 0 8px;
                color: #7f8c8d;
            }
            
            .dark-mode .qs-link-separator {
                color: #bdc3c7;
            }
            
            /* Error messages */
            .qs-auth-error {
                color: #e74c3c;
                background-color: rgba(231, 76, 60, 0.1);
                padding: 10px 15px;
                border-radius: 6px;
                border-left: 3px solid #e74c3c;
                margin-bottom: 20px;
                display: none;
            }
            
            .dark-mode .qs-auth-error {
                background-color: rgba(231, 76, 60, 0.15);
            }
            
            /* Success messages */
            .qs-auth-message {
                padding: 10px 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                display: none;
            }
            
            .qs-auth-message.qs-success {
                color: #2ecc71;
                background-color: rgba(46, 204, 113, 0.1);
                border-left: 3px solid #2ecc71;
            }
            
            .dark-mode .qs-auth-message.qs-success {
                background-color: rgba(46, 204, 113, 0.15);
            }
            
            /* Reset password info */
            .qs-reset-info, .qs-verification-info {
                margin-bottom: 20px;
                color: #7f8c8d;
            }
            
            .dark-mode .qs-reset-info, 
            .dark-mode .qs-verification-info {
                color: #bdc3c7;
            }
            
            /* Spinner */
            .qs-spinner {
                display: inline-block;
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: qs-spin 1s linear infinite;
                margin-right: 10px;
            }
            
            @keyframes qs-spin {
                to { transform: rotate(360deg); }
            }
            
            /* Password strength */
            .qs-password-strength {
                margin-top: 8px;
                font-size: 0.8rem;
            }
            
            .qs-strength-meter {
                height: 4px;
                background-color: #e0e0e0;
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 5px;
            }
            
            .dark-mode .qs-strength-meter {
                background-color: #546e7a;
            }
            
            .qs-strength-bar {
                height: 100%;
                width: 0;
                background-color: #3498db;
                transition: width 0.3s ease;
            }
            
            .qs-strength-bar.weak {
                background-color: #e74c3c;
            }
            
            .qs-strength-bar.medium {
                background-color: #f39c12;
            }
            
            .qs-strength-bar.strong {
                background-color: #2ecc71;
            }
            
            .qs-strength-text {
                text-align: right;
            }
            
            .qs-strength-text.weak {
                color: #e74c3c;
            }
            
            .qs-strength-text.medium {
                color: #f39c12;
            }
            
            .qs-strength-text.strong {
                color: #2ecc71;
            }
            
            /* User panel */
            .qs-user-panel {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .qs-user-panel.visible {
                opacity: 1;
                visibility: visible;
            }
            
            .qs-user-info {
                display: flex;
                align-items: center;
                background-color: white;
                border-radius: 30px;
                padding: 5px 5px 5px 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            }
            
            .dark-mode .qs-user-info {
                background-color: #2c3e50;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
            }
            
            .qs-user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                overflow: hidden;
                margin-right: 10px;
            }
            
            .qs-user-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .qs-user-details {
                margin-right: 10px;
            }
            
            .qs-user-name {
                font-weight: 500;
                color: #333;
            }
            
            .dark-mode .qs-user-name {
                color: #ecf0f1;
            }
            
            /* Verification badge */
            .qs-verification-status {
                margin-right: 10px;
            }
            
            .qs-verification-badge {
                background-color: #e74c3c;
                color: white;
                font-size: 0.7rem;
                padding: 3px 8px;
                border-radius: 10px;
                display: inline-block;
            }
            
            /* Verification status in admin panel */
            .qs-verification-status-verified {
                color: #2ecc71;
                font-weight: bold;
            }
            
            .qs-verification-status-unverified {
                color: #e74c3c;
                font-weight: bold;
            }
            
            .qs-logout-button {
                background-color: #e74c3c;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: background-color 0.2s ease;
                display: flex;
                align-items: center;
            }
            
            .qs-logout-button svg {
                margin-right: 5px;
            }
            
            .qs-logout-button:hover {
                background-color: #c0392b;
            }
            
            /* Admin Panel Styles */
            .qs-admin-note {
                background-color: rgba(52, 152, 219, 0.1);
                color: #3498db;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
                font-size: 0.9rem;
                text-align: center;
            }
            
            .qs-admin-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .qs-admin-button {
                background-color: #3498db;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
            }
            
            .qs-admin-button:hover {
                background-color: #2980b9;
                transform: translateY(-2px);
            }
            
            .qs-admin-section {
                margin-top: 20px;
            }
            
            .qs-admin-section h4 {
                margin-bottom: 10px;
                color: #2c3e50;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 5px;
            }
            
            .dark-mode .qs-admin-section h4 {
                color: #ecf0f1;
                border-bottom-color: #546e7a;
            }
            
            .qs-user-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            
            .dark-mode .qs-user-list {
                border-color: #546e7a;
            }
            
            .qs-user-item {
                padding: 10px;
                border-bottom: 1px solid #eee;
                position: relative;
            }
            
            .dark-mode .qs-user-item {
                border-bottom-color: #546e7a;
            }
            
            .qs-user-item:last-child {
                border-bottom: none;
            }
            
            .qs-user-email {
                font-weight: bold;
                color: #3498db;
                margin-bottom: 5px;
            }
            
            .qs-user-password {
                color: #e74c3c;
                margin-bottom: 5px;
                font-family: monospace;
            }
            
            .qs-user-name, .qs-user-created, .qs-user-lastlogin, .qs-user-verification {
                font-size: 0.9rem;
                color: #7f8c8d;
                margin-bottom: 3px;
            }
            
            .dark-mode .qs-user-name, 
            .dark-mode .qs-user-created, 
            .dark-mode .qs-user-lastlogin,
            .dark-mode .qs-user-verification {
                color: #bdc3c7;
            }
            
            .qs-user-actions {
                display: flex;
                gap: 5px;
                margin-top: 10px;
            }
            
            .qs-user-actions button {
                background-color: #f1f1f1;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .dark-mode .qs-user-actions button {
                background-color: #34495e;
                color: #ecf0f1;
            }
            
            .qs-delete-user {
                color: #e74c3c;
            }
            
            .qs-delete-user:hover {
                background-color: #e74c3c;
                color: white;
            }
            
            .qs-reset-user-pwd {
                color: #3498db;
            }
            
            .qs-reset-user-pwd:hover {
                background-color: #3498db;
                color: white;
            }
            
            .qs-verify-user {
                color: #2ecc71;
            }
            
            .qs-verify-user:hover {
                background-color: #2ecc71;
                color: white;
            }
            
            /* Admin button in user panel */
            .qs-admin-button-container {
                margin-right: 10px;
            }
            
            .qs-admin-dashboard-button {
                background-color: #9b59b6;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .qs-admin-dashboard-button:hover {
                background-color: #8e44ad;
            }
            
            /* Responsive styles */
            @media (max-width: 480px) {
                .qs-auth-modal {
                    width: 95%;
                }
                
                .qs-auth-content {
                    padding: 20px;
                }
                
                .qs-auth-logo h1 {
                    font-size: 1.8rem;
                }
                
                .qs-user-details {
                    display: none; /* Hide name on mobile */
                }
                
                .qs-admin-controls {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize);
    }
})();