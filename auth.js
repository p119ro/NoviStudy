// auth.js - Firebase Authentication for QuickStudy
(function() {
    // Your Firebase configuration from the Firebase console
    const firebaseConfig = {
        apiKey: "AIzaSyALHJ9nUYL2nkLnH3b6rKnyAsFgkJlxwPE",
        authDomain: "quickstudy-266de.firebaseapp.com",
        projectId: "quickstudy-266de",
        storageBucket: "quickstudy-266de.firebasestorage.app",
        messagingSenderId: "749419949262",
        appId: "1:749419949262:web:ad3bd2770264c31236b49f",
        measurementId: "G-BWP13BC1T1"
    };

    // Variables to track state
    let firebaseInitialized = false;
    let auth = null;
    let currentUser = null;
    let db = null;
    
    // Public API for other scripts to use
    window.QuickStudyAuth = {
        initialize,
        getCurrentUser,
        isLoggedIn,
        signOut,
        showLoginScreen
    };
    
    /**
     * Initialize Firebase and Auth
     */
    function initialize() {
        // Load Firebase scripts dynamically
        loadScripts()
            .then(() => {
                // Initialize Firebase
                firebase.initializeApp(firebaseConfig);
                auth = firebase.auth();
                
                // Initialize Firestore for user data
                db = firebase.firestore();
                
                // Set up auth state changed listener
                auth.onAuthStateChanged(handleAuthStateChanged);
                
                // Create the login UI
                createLoginUI();
                
                // Show login screen
                // Add this at the top of the file with other variables
                let authStateChecked = false;

                // Then replace the "Show login screen" section in the initialize() function with:
                // Don't show login screen until auth state is determined
                document.body.classList.add('qs-auth-loading');
                
                firebaseInitialized = true;
                console.log("Firebase Auth initialized successfully");
            })
            .catch(error => {
                console.error("Error initializing Firebase:", error);
            });
    }
    
    /**
     * Load Firebase scripts dynamically
     */
    function loadScripts() {
        return Promise.all([
            loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"),
            loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"),
            loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js")
        ]);
    }
    
    /**
     * Helper function to load a script
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Handle auth state changes
     */
    function handleAuthStateChanged(user) {
        // Remove loading state
        document.body.classList.remove('qs-auth-loading');
        authStateChecked = true;
        
        currentUser = user;
        
        if (user) {
            console.log("User signed in:", user.email);
            hideLoginScreen();
            showUserInfo(user);
            updateUserLastLogin(user.uid);
            
            // If QuickStudyMemory exists, link it with user data
            if (window.QuickStudyMemory) {
                linkWithQuickStudyMemory();
            }
        } else {
            console.log("User signed out");
            hideUserInfo();
            
            // Only show login screen if we've confirmed user is not authenticated
            if (authStateChecked) {
                showLoginScreen();
            }
        }
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
     * Sign out current user
     */
    function signOut() {
        if (!auth) return;
        
        auth.signOut()
            .then(() => {
                console.log("User signed out successfully");
            })
            .catch(error => {
                console.error("Error signing out:", error);
            });
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
                            <h1>QuickStudy</h1>
                            <p>Study smarter, not harder</p>
                        </div>
                        
                        <div class="qs-auth-tabs">
                            <button id="qs-login-tab" class="qs-auth-tab active">Log In</button>
                            <button id="qs-signup-tab" class="qs-auth-tab">Sign Up</button>
                        </div>
                        
                        <div class="qs-auth-content">
                            <!-- Login Form -->
                            <form id="qs-login-form" class="qs-auth-form active">
                                <div id="qs-login-error" class="qs-auth-error"></div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-login-email">Email</label>
                                    <input type="email" id="qs-login-email" placeholder="Your email" required>
                                </div>
                                
                                <div class="qs-input-group">
                                    <label for="qs-login-password">Password</label>
                                    <input type="password" id="qs-login-password" placeholder="Your password" required>
                                </div>
                                
                                <button type="submit" id="qs-login-button" class="qs-auth-button">Log In</button>
                                
                                <div class="qs-auth-separator">
                                    <span>OR</span>
                                </div>
                                
                                <button type="button" id="qs-google-login" class="qs-auth-button qs-google-button">
                                    <svg class="qs-google-icon" viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Continue with Google
                                </button>
                                
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
                                
                                <div class="qs-auth-separator">
                                    <span>OR</span>
                                </div>
                                
                                <button type="button" id="qs-google-signup" class="qs-auth-button qs-google-button">
                                    <svg class="qs-google-icon" viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Sign up with Google
                                </button>
                            </form>
                            
                            <!-- Reset Password Form -->
                            <form id="qs-reset-form" class="qs-auth-form">
                                <div id="qs-reset-message" class="qs-auth-message"></div>
                                
                                <p class="qs-reset-info">Enter your email address and we'll send you a link to reset your password.</p>
                                
                                <div class="qs-input-group">
                                    <label for="qs-reset-email">Email</label>
                                    <input type="email" id="qs-reset-email" placeholder="Your email" required>
                                </div>
                                
                                <button type="submit" id="qs-reset-button" class="qs-auth-button">Send Reset Link</button>
                                
                                <div class="qs-auth-links">
                                    <a href="#" id="qs-back-to-login">Back to login</a>
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
            document.body.appendChild(div.firstElementChild);
            document.body.appendChild(div.firstElementChild);
            
            // Add event listeners
            addEventListeners();
        }
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
        
        // Google authentication
        document.getElementById("qs-google-login").addEventListener("click", handleGoogleAuth);
        document.getElementById("qs-google-signup").addEventListener("click", handleGoogleAuth);
        
        // Password reset links
        document.getElementById("qs-forgot-password").addEventListener("click", (e) => {
            e.preventDefault();
            showResetForm();
        });
        
        document.getElementById("qs-back-to-login").addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("login");
        });
        
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
            default:
                formId = "qs-login-form";
        }
        
        document.getElementById(formId).classList.add("active");
        
        // Clear error messages
        clearErrors();
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
     * Handle login form submission
     */
    function handleLogin() {
        const email = document.getElementById("qs-login-email").value;
        const password = document.getElementById("qs-login-password").value;
        
        if (!email || !password) {
            showError("login", "Please enter both email and password");
            return;
        }
        
        // Show loading state
        const loginButton = document.getElementById("qs-login-button");
        loginButton.disabled = true;
        loginButton.innerHTML = '<div class="qs-spinner"></div> Logging in...';
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                // Success - will be handled by onAuthStateChanged
                clearErrors();
            })
            .catch(error => {
                console.error("Login error:", error);
                
                let errorMessage = "Failed to sign in. Please check your credentials.";
                
                switch (error.code) {
                    case "auth/invalid-email":
                        errorMessage = "Invalid email address format";
                        break;
                    case "auth/user-not-found":
                    case "auth/wrong-password":
                        errorMessage = "Invalid email or password";
                        break;
                    case "auth/user-disabled":
                        errorMessage = "This account has been disabled";
                        break;
                    case "auth/too-many-requests":
                        errorMessage = "Too many unsuccessful login attempts. Please try again later";
                        break;
                }
                
                showError("login", errorMessage);
            })
            .finally(() => {
                // Reset button
                loginButton.disabled = false;
                loginButton.innerHTML = "Log In";
            });
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
        
        // Show loading state
        const signupButton = document.getElementById("qs-signup-button");
        signupButton.disabled = true;
        signupButton.innerHTML = '<div class="qs-spinner"></div> Creating account...';
        
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Update profile with display name
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                // Create user document in Firestore
                return createUserDocument(auth.currentUser.uid, {
                    displayName: name,
                    email: email,
                    createdAt: new Date().toISOString()
                });
            })
            .then(() => {
                // Success - will be handled by onAuthStateChanged
                clearErrors();
            })
            .catch(error => {
                console.error("Signup error:", error);
                
                let errorMessage = "Failed to create account";
                
                switch (error.code) {
                    case "auth/email-already-in-use":
                        errorMessage = "Email is already in use";
                        break;
                    case "auth/invalid-email":
                        errorMessage = "Invalid email address format";
                        break;
                    case "auth/weak-password":
                        errorMessage = "Password is too weak";
                        break;
                    case "auth/operation-not-allowed":
                        errorMessage = "Email/password accounts are not enabled";
                        break;
                }
                
                showError("signup", errorMessage);
            })
            .finally(() => {
                // Reset button
                signupButton.disabled = false;
                signupButton.innerHTML = "Create Account";
            });
    }
    
    /**
     * Handle Google authentication
     */
    function handleGoogleAuth() {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Show loading state
        const googleButtons = document.querySelectorAll(".qs-google-button");
        const originalHTML = googleButtons[0].innerHTML;
        
        googleButtons.forEach(button => {
            button.disabled = true;
            button.innerHTML = '<div class="qs-spinner"></div> Connecting...';
        });
        
        auth.signInWithPopup(provider)
            .then(result => {
                // Create or update user document
                return createUserDocument(result.user.uid, {
                    displayName: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    lastLogin: new Date().toISOString()
                });
            })
            .then(() => {
                // Success - will be handled by onAuthStateChanged
                clearErrors();
            })
            .catch(error => {
                console.error("Google auth error:", error);
                
                let errorMessage = "Failed to sign in with Google";
                
                switch (error.code) {
                    case "auth/account-exists-with-different-credential":
                        errorMessage = "An account already exists with the same email but different sign-in method";
                        break;
                    case "auth/popup-blocked":
                        errorMessage = "Sign-in popup was blocked by your browser";
                        break;
                    case "auth/popup-closed-by-user":
                        errorMessage = "Sign-in popup was closed before completing the sign-in";
                        break;
                }
                
                showError("login", errorMessage);
                showError("signup", errorMessage);
            })
            .finally(() => {
                // Reset buttons
                googleButtons.forEach(button => {
                    button.disabled = false;
                    button.innerHTML = originalHTML;
                });
            });
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
        resetButton.innerHTML = '<div class="qs-spinner"></div> Sending...';
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showSuccess("reset", `Password reset email sent to ${email}`);
                document.getElementById("qs-reset-email").value = "";
                
                // Automatically return to login after a delay
                setTimeout(() => {
                    switchTab("login");
                }, 3000);
            })
            .catch(error => {
                console.error("Password reset error:", error);
                
                let errorMessage = "Failed to send password reset email";
                
                switch (error.code) {
                    case "auth/invalid-email":
                        errorMessage = "Invalid email address format";
                        break;
                    case "auth/user-not-found":
                        errorMessage = "No account found with this email address";
                        break;
                }
                
                showError("reset", errorMessage);
            })
            .finally(() => {
                // Reset button
                resetButton.disabled = false;
                resetButton.innerHTML = "Send Reset Link";
            });
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
        
        if (userPanel && userName && userAvatar) {
            userName.textContent = user.displayName || user.email;
            userAvatar.src = user.photoURL || createDefaultAvatar(user.displayName || user.email);
            userPanel.classList.add("visible");
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
     * Create or update user document in Firestore
     */
    function createUserDocument(userId, userData) {
        if (!db) return Promise.reject(new Error("Firestore not initialized"));
        
        const userRef = db.collection("users").doc(userId);
        
        return userRef.get()
            .then(doc => {
                if (doc.exists) {
                    // Update existing document
                    return userRef.update({
                        ...userData,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Create new document
                    return userRef.set({
                        ...userData,
                        createdAt: new Date().toISOString()
                    });
                }
            });
    }
    
    /**
     * Update user's last login timestamp
     */
    function updateUserLastLogin(userId) {
        if (!db) return;
        
        const userRef = db.collection("users").doc(userId);
        userRef.update({
            lastLogin: new Date().toISOString()
        }).catch(error => {
            console.error("Error updating last login:", error);
        });
    }
    
    /**
     * Link with QuickStudyMemory for saving progress
     */
    function linkWithQuickStudyMemory() {
        if (!window.QuickStudyMemory || !currentUser) return;
        
        // Extend the original saveProgress function to also save to Firebase
        const originalSaveProgress = window.QuickStudyMemory.saveProgress;
        
        window.QuickStudyMemory.saveProgress = function(state, presetId) {
            // Call original function first
            const result = originalSaveProgress.apply(this, arguments);
            
            // If user is logged in, save to Firestore too
            if (currentUser && db) {
                const userProgressRef = db.collection("users").doc(currentUser.uid)
                    .collection("progress").doc(presetId);
                
                userProgressRef.set({
                    currentQuestionIndex: state.currentQuestionIndex,
                    correctAnswers: state.correctAnswers,
                    incorrectAnswers: state.incorrectAnswers,
                    totalTime: state.totalTime,
                    updatedAt: new Date().toISOString()
                }).catch(error => {
                    console.error("Error saving progress to Firestore:", error);
                });
            }
            
            return result;
        };
        
        // Add cloud sync for progress loading
        const originalLoadProgress = window.QuickStudyMemory.loadProgress;
        
        window.QuickStudyMemory.loadProgress = function(presetId) {
            // First try to load from local storage
            const localProgress = originalLoadProgress.apply(this, arguments);
            
            // If user is logged in, check for cloud progress
            if (currentUser && db) {
                const userProgressRef = db.collection("users").doc(currentUser.uid)
                    .collection("progress").doc(presetId);
                
                userProgressRef.get().then(doc => {
                    if (doc.exists) {
                        const cloudProgress = doc.data();
                        
                        // If there's no local progress or cloud progress is newer, use cloud progress
                        if (!localProgress || (cloudProgress.updatedAt > localProgress.timestamp)) {
                            console.log("Using cloud progress for", presetId);
                            // TODO: Implement proper progress restoration from cloud
                        }
                    }
                }).catch(error => {
                    console.error("Error loading progress from Firestore:", error);
                });
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
            .qs-auth-container {
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
            
            .qs-auth-container.visible {
                opacity: 1;
                visibility: visible;
            }
            
            .qs-body-with-auth {
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
            
            /* Google button */
            .qs-google-button {
                background-color: white;
                color: #333;
                border: 1px solid #ddd;
                margin-top: 10px;
            }
            
            .qs-google-button:hover {
                background-color: #f5f5f5;
                color: #333;
            }
            
            .dark-mode .qs-google-button {
                background-color: #34495e;
                color: #ecf0f1;
                border-color: #546e7a;
            }
            
            .dark-mode .qs-google-button:hover {
                background-color: #2c3e50;
            }
            
            .qs-google-icon {
                margin-right: 10px;
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
            
            /* Separator */
            .qs-auth-separator {
                display: flex;
                align-items: center;
                margin: 20px 0;
            }
            
            .qs-auth-separator::before,
            .qs-auth-separator::after {
                content: '';
                flex: 1;
                height: 1px;
                background-color: #e0e0e0;
            }
            
            .dark-mode .qs-auth-separator::before,
            .dark-mode .qs-auth-separator::after {
                background-color: #546e7a;
            }
            
            .qs-auth-separator span {
                padding: 0 10px;
                color: #7f8c8d;
                font-size: 0.8rem;
            }
            
            .dark-mode .qs-auth-separator span {
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
            .qs-reset-info {
                margin-bottom: 20px;
                color: #7f8c8d;
            }
            
            .dark-mode .qs-reset-info {
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

            /* Add this to your CSS styles */
            .qs-auth-loading .qs-auth-container {
                display: none;
            }

            /* Loading state with no auth flicker */
            .qs-auth-loading::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #fff;
                z-index: 9998;
            }

            .dark-mode.qs-auth-loading::before {
                background-color: #2c3e50;
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
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    // Initialize as soon as the DOM is ready
    document.addEventListener("DOMContentLoaded", initialize);
})();