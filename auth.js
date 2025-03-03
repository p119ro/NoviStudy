// QuickStudy Authentication System
// This file handles user authentication using Firebase

// QuickStudyAuth namespace
window.QuickStudyAuth = (function() {
    // Firebase configuration - Using your specific Firebase project settings
    const firebaseConfig = {
        apiKey: "AIzaSyALHJ9nUYL2nkLnH3b6rKnyAsFgkJlxwPE",
        authDomain: "quickstudy-266de.firebaseapp.com",
        projectId: "quickstudy-266de",
        storageBucket: "quickstudy-266de.firebasestorage.app",
        messagingSenderId: "749419949262",
        appId: "1:749419949262:web:ad3bd2770264c31236b49f",
        measurementId: "G-BWP13BC1T1"
    };

    // Initialize Firebase
    let app;
    let auth;
    let firestore;
    let currentUser = null;
    let authStateChangedCallbacks = [];
    
    // DOM elements (will be set after DOM is loaded)
    let elements = {
        authContainer: null,
        loginContainer: null,
        registerContainer: null,
        profileContainer: null,
        loginForm: null,
        registerForm: null,
        googleSignInButton: null,
        emailVerificationMessage: null,
        loginError: null,
        registerError: null,
        profileUsername: null,
        profileEmail: null,
        profilePicture: null,
        logoutButton: null,
        forgotPasswordLink: null,
        resetPasswordContainer: null,
        resetPasswordForm: null,
        resetPasswordEmail: null,
        resetPasswordError: null,
        resetPasswordSuccess: null,
        backToLoginButton: null
    };

    // Initialize authentication
    function initialize() {
        try {
            // Initialize Firebase with your config
            firebase.initializeApp(firebaseConfig);
            
            // Get auth and firestore instances
            auth = firebase.auth();
            firestore = firebase.firestore();
            
            // Initialize analytics if available
            if (firebase.analytics) {
                firebase.analytics();
            }
            
            // Set up auth state changed listener
            auth.onAuthStateChanged(handleAuthStateChanged);
            
            console.log("Firebase Authentication initialized successfully");
            
            // Set up UI elements
            setupAuthUI();
        } catch (error) {
            console.error("Error initializing Firebase:", error);
        }
    }

    // Handle auth state changes
    function handleAuthStateChanged(user) {
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Get or create user document in firestore
            const userDocRef = firestore.collection("users").doc(user.uid);
            
            userDocRef.get().then((docSnap) => {
                if (!docSnap.exists) {
                    // Create new user document if it doesn't exist
                    userDocRef.set({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        photoURL: user.photoURL || null,
                        createdAt: new Date(),
                        categories: {},
                        lastActive: new Date()
                    });
                } else {
                    // Update last active timestamp
                    userDocRef.update({
                        lastActive: new Date()
                    });
                }
            });
            
            console.log("User signed in:", user.email);
            
            // Update UI for authenticated user
            updateUIForAuthenticatedUser(user);
            
            // Check if email is verified
            if (!user.emailVerified && user.providerData[0].providerId === 'password') {
                showEmailVerificationMessage();
            } else {
                hideEmailVerificationMessage();
            }
        } else {
            // User is signed out
            currentUser = null;
            console.log("User signed out");
            
            // Update UI for unauthenticated user
            updateUIForUnauthenticatedUser();
        }
        
        // Call all registered auth state changed callbacks
        authStateChangedCallbacks.forEach(callback => {
            try {
                callback(currentUser);
            } catch (error) {
                console.error("Error in auth state changed callback:", error);
            }
        });
    }

    // Register a callback for auth state changes
    function onAuthStateChanged(callback) {
        if (typeof callback === 'function') {
            authStateChangedCallbacks.push(callback);
            
            // Call immediately with current state if already determined
            if (currentUser !== null) {
                try {
                    callback(currentUser);
                } catch (error) {
                    console.error("Error in auth state changed callback:", error);
                }
            }
        }
    }

    // Setup authentication UI
    function setupAuthUI() {
        // Wait for DOM to be loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createAuthUI);
        } else {
            createAuthUI();
        }
    }

    // Create authentication UI elements
    function createAuthUI() {
        // Create root container for auth UI
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.className = 'auth-container';
        
        // Login container
        const loginContainer = document.createElement('div');
        loginContainer.id = 'login-container';
        loginContainer.className = 'auth-form-container';
        
        // Register container
        const registerContainer = document.createElement('div');
        registerContainer.id = 'register-container';
        registerContainer.className = 'auth-form-container hidden';
        
        // Profile container (shown when user is logged in)
        const profileContainer = document.createElement('div');
        profileContainer.id = 'profile-container';
        profileContainer.className = 'auth-form-container hidden';
        
        // Reset password container
        const resetPasswordContainer = document.createElement('div');
        resetPasswordContainer.id = 'reset-password-container';
        resetPasswordContainer.className = 'auth-form-container hidden';
        
        // Login form
        loginContainer.innerHTML = `
            <h2>Log in to QuickStudy</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" required>
                </div>
                <div class="form-error hidden" id="login-error"></div>
                <button type="submit" class="btn btn-primary">Log In</button>
                <div class="form-group">
                    <a href="#" id="forgot-password-link">Forgot password?</a>
                </div>
                <div class="separator">
                    <span>OR</span>
                </div>
                <button type="button" id="google-signin" class="btn btn-google">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                    Sign in with Google
                </button>
                <div class="auth-link-container">
                    <span>Don't have an account?</span>
                    <a href="#" id="to-register-link">Sign up</a>
                </div>
            </form>
        `;
        
        // Register form
        registerContainer.innerHTML = `
            <h2>Create QuickStudy Account</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" required>
                </div>
                <div class="form-group">
                    <label for="register-password">Password</label>
                    <input type="password" id="register-password" required minlength="6">
                    <div class="password-strength-meter">
                        <div class="strength-bar"></div>
                    </div>
                    <div class="password-hint">Password must be at least 6 characters</div>
                </div>
                <div class="form-group">
                    <label for="register-password-confirm">Confirm Password</label>
                    <input type="password" id="register-password-confirm" required>
                </div>
                <div class="form-error hidden" id="register-error"></div>
                <button type="submit" class="btn btn-primary">Sign Up</button>
                <div class="auth-link-container">
                    <span>Already have an account?</span>
                    <a href="#" id="to-login-link">Log in</a>
                </div>
            </form>
        `;
        
        // Reset password form
        resetPasswordContainer.innerHTML = `
            <h2>Reset Password</h2>
            <form id="reset-password-form">
                <div class="form-group">
                    <label for="reset-password-email">Email</label>
                    <input type="email" id="reset-password-email" required>
                </div>
                <div class="form-error hidden" id="reset-password-error"></div>
                <div class="form-success hidden" id="reset-password-success"></div>
                <button type="submit" class="btn btn-primary">Send Reset Email</button>
                <div class="auth-link-container">
                    <a href="#" id="back-to-login">Back to Login</a>
                </div>
            </form>
        `;
        
        // Profile information (when logged in)
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-picture-container">
                    <img id="profile-picture" src="https://via.placeholder.com/64" alt="Profile Picture">
                </div>
                <div class="profile-info">
                    <h2 id="profile-username">Username</h2>
                    <p id="profile-email">user@example.com</p>
                </div>
            </div>
            <div id="email-verification-message" class="verification-message hidden">
                <p>Please verify your email address. Check your inbox for a verification link.</p>
                <button id="resend-verification" class="btn btn-secondary">Resend Verification</button>
            </div>
            <div class="profile-actions">
                <button id="logout-button" class="btn btn-secondary">Log Out</button>
            </div>
        `;
        
        // Append all containers to the auth container
        authContainer.appendChild(loginContainer);
        authContainer.appendChild(registerContainer);
        authContainer.appendChild(profileContainer);
        authContainer.appendChild(resetPasswordContainer);
        
        // Add the auth container to the document
        document.body.appendChild(authContainer);
        
        // Store references to elements
        elements = {
            authContainer: document.getElementById('auth-container'),
            loginContainer: document.getElementById('login-container'),
            registerContainer: document.getElementById('register-container'),
            profileContainer: document.getElementById('profile-container'),
            resetPasswordContainer: document.getElementById('reset-password-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            resetPasswordForm: document.getElementById('reset-password-form'),
            googleSignInButton: document.getElementById('google-signin'),
            emailVerificationMessage: document.getElementById('email-verification-message'),
            loginError: document.getElementById('login-error'),
            registerError: document.getElementById('register-error'),
            resetPasswordError: document.getElementById('reset-password-error'),
            resetPasswordSuccess: document.getElementById('reset-password-success'),
            profileUsername: document.getElementById('profile-username'),
            profileEmail: document.getElementById('profile-email'),
            profilePicture: document.getElementById('profile-picture'),
            logoutButton: document.getElementById('logout-button'),
            forgotPasswordLink: document.getElementById('forgot-password-link'),
            resetPasswordEmail: document.getElementById('reset-password-email'),
            backToLoginButton: document.getElementById('back-to-login')
        };
        
        // Add event listeners
        setupEventListeners();
        
        // Create and add styles
        addAuthStyles();
    }
    
    // Add event listeners for auth forms
    function setupEventListeners() {
        // Login form submission
        elements.loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            signInWithEmailPassword(email, password);
        });
        
        // Register form submission
        elements.registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            
            if (password !== passwordConfirm) {
                showRegisterError("Passwords do not match");
                return;
            }
            
            createAccountWithEmailPassword(email, password);
        });
        
        // Reset password form submission
        elements.resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = elements.resetPasswordEmail.value;
            sendPasswordResetEmail(email);
        });
        
        // Google sign-in button click
        elements.googleSignInButton.addEventListener('click', function() {
            signInWithGoogle();
        });
        
        // Logout button click
        elements.logoutButton.addEventListener('click', function() {
            signOut();
        });
        
        // Resend verification email
        document.getElementById('resend-verification').addEventListener('click', function() {
            sendEmailVerification();
        });
        
        // Form navigation links
        document.getElementById('to-register-link').addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
        
        document.getElementById('to-login-link').addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
        
        // Forgot password link
        elements.forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showResetPasswordForm();
        });
        
        // Back to login button
        elements.backToLoginButton.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
        
        // Password strength meter
        const passwordInput = document.getElementById('register-password');
        const strengthBar = document.querySelector('.strength-bar');
        
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            if (password.length >= 6) {
                strength += 20;
            }
            if (password.length >= 8) {
                strength += 20;
            }
            if (password.match(/[A-Z]/)) {
                strength += 20;
            }
            if (password.match(/[0-9]/)) {
                strength += 20;
            }
            if (password.match(/[^A-Za-z0-9]/)) {
                strength += 20;
            }
            
            strengthBar.style.width = `${strength}%`;
            
            if (strength <= 40) {
                strengthBar.style.backgroundColor = '#ff4d4d';
            } else if (strength <= 80) {
                strengthBar.style.backgroundColor = '#ffa64d';
            } else {
                strengthBar.style.backgroundColor = '#4CAF50';
            }
        });
    }
    
    // Sign in with email and password
    function signInWithEmailPassword(email, password) {
        hideLoginError();
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                console.log("User signed in:", user.email);
            })
            .catch((error) => {
                console.error("Login error:", error);
                showLoginError(getAuthErrorMessage(error.code));
            });
    }
    
    // Sign in with Google
    function signInWithGoogle() {
        hideLoginError();
        
        const provider = new firebase.auth.GoogleAuthProvider();
        
        auth.signInWithPopup(provider)
            .then((result) => {
                // This gives you a Google Access Token. You can use it to access the Google API.
                const credential = result.credential;
                const token = credential.accessToken;
                // The signed-in user info.
                const user = result.user;
                console.log("Google sign-in successful:", user.email);
            })
            .catch((error) => {
                console.error("Google sign-in error:", error);
                showLoginError(getAuthErrorMessage(error.code));
            });
    }
    
    // Create account with email and password
    function createAccountWithEmailPassword(email, password) {
        hideRegisterError();
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Account created
                const user = userCredential.user;
                console.log("Account created:", user.email);
                
                // Send email verification
                sendEmailVerification();
                
                // Show login form
                showLoginForm();
            })
            .catch((error) => {
                console.error("Registration error:", error);
                showRegisterError(getAuthErrorMessage(error.code));
            });
    }
    
    // Send password reset email
    function sendPasswordResetEmail(email) {
        hideResetPasswordError();
        hideResetPasswordSuccess();
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                console.log("Password reset email sent to:", email);
                showResetPasswordSuccess("Password reset email sent. Check your inbox.");
                
                // Clear the email field
                elements.resetPasswordEmail.value = '';
            })
            .catch((error) => {
                console.error("Password reset error:", error);
                showResetPasswordError(getAuthErrorMessage(error.code));
            });
    }
    
    // Send email verification
    function sendEmailVerification() {
        if (!currentUser) return;
        
        currentUser.sendEmailVerification()
            .then(() => {
                console.log("Verification email sent to:", currentUser.email);
                showEmailVerificationMessage();
            })
            .catch((error) => {
                console.error("Error sending verification email:", error);
            });
    }
    
    // Sign out the current user
    function signOut() {
        auth.signOut()
            .then(() => {
                console.log("User signed out");
            })
            .catch((error) => {
                console.error("Sign out error:", error);
            });
    }
    
    // Show login form
    function showLoginForm() {
        elements.loginContainer.classList.remove('hidden');
        elements.registerContainer.classList.add('hidden');
        elements.profileContainer.classList.add('hidden');
        elements.resetPasswordContainer.classList.add('hidden');
        
        // Clear any previous errors
        hideLoginError();
    }
    
    // Show register form
    function showRegisterForm() {
        elements.loginContainer.classList.add('hidden');
        elements.registerContainer.classList.remove('hidden');
        elements.profileContainer.classList.add('hidden');
        elements.resetPasswordContainer.classList.add('hidden');
        
        // Clear any previous errors
        hideRegisterError();
    }
    
    // Show reset password form
    function showResetPasswordForm() {
        elements.loginContainer.classList.add('hidden');
        elements.registerContainer.classList.add('hidden');
        elements.profileContainer.classList.add('hidden');
        elements.resetPasswordContainer.classList.remove('hidden');
        
        // Clear any previous messages
        hideResetPasswordError();
        hideResetPasswordSuccess();
    }
    
    // Show profile screen
    function showProfileScreen() {
        elements.loginContainer.classList.add('hidden');
        elements.registerContainer.classList.add('hidden');
        elements.profileContainer.classList.remove('hidden');
        elements.resetPasswordContainer.classList.add('hidden');
    }
    
    // Update UI for authenticated user
    function updateUIForAuthenticatedUser(user) {
        if (!elements.profileUsername) return;
        
        // Update profile information
        elements.profileUsername.textContent = user.displayName || user.email.split('@')[0];
        elements.profileEmail.textContent = user.email;
        
        // Update profile picture
        if (user.photoURL) {
            elements.profilePicture.src = user.photoURL;
        } else {
            // Use a default profile picture
            elements.profilePicture.src = 'https://via.placeholder.com/64';
        }
        
        // Show the profile container
        showProfileScreen();
    }
    
    // Update UI for unauthenticated user
    function updateUIForUnauthenticatedUser() {
        // Show the login form
        showLoginForm();
        
        // Remove any email verification message
        hideEmailVerificationMessage();
    }
    
    // Show login error message
    function showLoginError(message) {
        if (!elements.loginError) return;
        
        elements.loginError.textContent = message;
        elements.loginError.classList.remove('hidden');
    }
    
    // Hide login error message
    function hideLoginError() {
        if (!elements.loginError) return;
        
        elements.loginError.textContent = '';
        elements.loginError.classList.add('hidden');
    }
    
    // Show register error message
    function showRegisterError(message) {
        if (!elements.registerError) return;
        
        elements.registerError.textContent = message;
        elements.registerError.classList.remove('hidden');
    }
    
    // Hide register error message
    function hideRegisterError() {
        if (!elements.registerError) return;
        
        elements.registerError.textContent = '';
        elements.registerError.classList.add('hidden');
    }
    
    // Show reset password error message
    function showResetPasswordError(message) {
        if (!elements.resetPasswordError) return;
        
        elements.resetPasswordError.textContent = message;
        elements.resetPasswordError.classList.remove('hidden');
    }
    
    // Hide reset password error message
    function hideResetPasswordError() {
        if (!elements.resetPasswordError) return;
        
        elements.resetPasswordError.textContent = '';
        elements.resetPasswordError.classList.add('hidden');
    }
    
    // Show reset password success message
    function showResetPasswordSuccess(message) {
        if (!elements.resetPasswordSuccess) return;
        
        elements.resetPasswordSuccess.textContent = message;
        elements.resetPasswordSuccess.classList.remove('hidden');
    }
    
    // Hide reset password success message
    function hideResetPasswordSuccess() {
        if (!elements.resetPasswordSuccess) return;
        
        elements.resetPasswordSuccess.textContent = '';
        elements.resetPasswordSuccess.classList.add('hidden');
    }
    
    // Show email verification message
    function showEmailVerificationMessage() {
        if (!elements.emailVerificationMessage) return;
        
        elements.emailVerificationMessage.classList.remove('hidden');
    }
    
    // Hide email verification message
    function hideEmailVerificationMessage() {
        if (!elements.emailVerificationMessage) return;
        
        elements.emailVerificationMessage.classList.add('hidden');
    }
    
    // Add authentication styles
    function addAuthStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .auth-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .auth-form-container {
                background-color: white;
                width: 90%;
                max-width: 400px;
                padding: 25px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .auth-form-container h2 {
                text-align: center;
                margin-bottom: 25px;
                color: var(--primary-color, #3498db);
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #333;
            }
            
            .form-group input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 14px;
            }
            
            .btn {
                display: block;
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                text-align: center;
                margin-top: 15px;
                transition: all 0.3s ease;
            }
            
            .btn-primary {
                background-color: var(--primary-color, #3498db);
                color: white;
            }
            
            .btn-primary:hover {
                background-color: var(--primary-dark, #2980b9);
            }
            
            .btn-secondary {
                background-color: #95a5a6;
                color: white;
            }
            
            .btn-secondary:hover {
                background-color: #7f8c8d;
            }
            
            .btn-google {
                background-color: white;
                color: #333;
                border: 1px solid #ddd;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .btn-google:hover {
                background-color: #f5f5f5;
            }
            
            .btn-google img {
                width: 18px;
                height: 18px;
                margin-right: 10px;
            }
            
            .hidden {
                display: none;
            }
            
            .separator {
                display: flex;
                align-items: center;
                text-align: center;
                margin: 20px 0;
            }
            
            .separator::before,
            .separator::after {
                content: '';
                flex: 1;
                border-bottom: 1px solid #ddd;
            }
            
            .separator span {
                padding: 0 10px;
                color: #999;
                font-size: 12px;
            }
            
            .auth-link-container {
                text-align: center;
                margin-top: 15px;
                font-size: 14px;
            }
            
            .auth-link-container a {
                color: var(--primary-color, #3498db);
                text-decoration: none;
                font-weight: 500;
                margin-left: 5px;
            }
            
            .auth-link-container a:hover {
                text-decoration: underline;
            }
            
            .form-error {
                background-color: #ffebee;
                color: #c62828;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 14px;
            }
            
            .form-success {
                background-color: #e8f5e9;
                color: #2e7d32;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 14px;
            }
            
            .profile-header {
                display: flex;
                align-items: center;
                margin-bottom: 25px;
            }
            
            .profile-picture-container {
                margin-right: 20px;
            }
            
            .profile-picture-container img {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                object-fit: cover;
            }
            
            .profile-info h2 {
                margin: 0 0 5px 0;
                text-align: left;
            }
            
            .profile-info p {
                margin: 0;
                color: #666;
            }
            
            .verification-message {
                background-color: #fff3e0;
                color: #e65100;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
                font-size: 14px;
            }
            
            .password-strength-meter {
                height: 5px;
                background-color: #eee;
                margin-top: 5px;
                border-radius: 3px;
                overflow: hidden;
            }
            
            .strength-bar {
                height: 100%;
                width: 0;
                background-color: #ff4d4d;
                transition: width 0.3s, background-color 0.3s;
            }
            
            .password-hint {
                font-size: 12px;
                color: #777;
                margin-top: 5px;
            }
            
            /* Dark mode styles */
            body.dark-mode .auth-form-container {
                background-color: var(--card-bg-dark, #34495e);
                color: var(--dark-text, #ecf0f1);
            }
            
            body.dark-mode .form-group label {
                color: var(--dark-text, #ecf0f1);
            }
            
            body.dark-mode .form-group input {
                background-color: var(--dark-bg, #2c3e50);
                border-color: #546e7a;
                color: var(--dark-text, #ecf0f1);
            }
            
            body.dark-mode .btn-google {
                background-color: var(--dark-bg, #2c3e50);
                color: var(--dark-text, #ecf0f1);
                border-color: #546e7a;
            }
            
            body.dark-mode .separator::before,
            body.dark-mode .separator::after {
                border-color: #546e7a;
            }
            
            body.dark-mode .separator span {
                color: #bdc3c7;
            }
            
            body.dark-mode .profile-info p {
                color: #bdc3c7;
            }
            
            body.dark-mode .password-hint {
                color: #bdc3c7;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    // Get human-readable error message from Firebase error code
    function getAuthErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'Invalid email address format.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password is too weak. It should be at least 6 characters.';
            case 'auth/operation-not-allowed':
                return 'This operation is not allowed.';
            case 'auth/account-exists-with-different-credential':
                return 'An account already exists with the same email but different sign-in credentials.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in popup was closed before completing the sign-in.';
            case 'auth/unauthorized-domain':
                return 'This domain is not authorized for OAuth operations.';
            case 'auth/timeout':
                return 'The operation has timed out.';
            default:
                return 'An error occurred during authentication. Please try again.';
        }
    }
    
    // Save user progress to Firestore
    function saveUserProgress(data) {
        if (!currentUser) {
            console.warn("Cannot save progress: User not logged in");
            return Promise.reject(new Error("User not logged in"));
        }
        
        const userDocRef = firestore.collection("users").doc(currentUser.uid);
        
        // Merge the data with existing data
        return userDocRef.set(data, { merge: true })
            .then(() => {
                console.log("User progress saved successfully");
                return true;
            })
            .catch((error) => {
                console.error("Error saving user progress:", error);
                throw error;
            });
    }
    
    // Save category progress
    function saveCategoryProgress(category, data) {
        if (!currentUser) {
            console.warn("Cannot save category progress: User not logged in");
            return Promise.reject(new Error("User not logged in"));
        }
        
        const userDocRef = firestore.collection("users").doc(currentUser.uid);
        
        // Create the update object
        const updateData = {
            categories: {
                [category]: data
            },
            lastActive: new Date()
        };
        
        // Merge the data with existing data
        return userDocRef.set(updateData, { merge: true })
            .then(() => {
                console.log(`Progress for category "${category}" saved successfully`);
                return true;
            })
            .catch((error) => {
                console.error(`Error saving progress for category "${category}":`, error);
                throw error;
            });
    }
    
    // Load user progress from Firestore
    function loadUserProgress() {
        if (!currentUser) {
            console.warn("Cannot load progress: User not logged in");
            return Promise.reject(new Error("User not logged in"));
        }
        
        const userDocRef = firestore.collection("users").doc(currentUser.uid);
        
        return userDocRef.get()
            .then((docSnap) => {
                if (docSnap.exists) {
                    console.log("User progress loaded successfully");
                    return docSnap.data();
                } else {
                    console.log("No user progress found");
                    return {};
                }
            })
            .catch((error) => {
                console.error("Error loading user progress:", error);
                throw error;
            });
    }
    
    // Load category progress
    function loadCategoryProgress(category) {
        if (!currentUser) {
            console.warn("Cannot load category progress: User not logged in");
            return Promise.reject(new Error("User not logged in"));
        }
        
        const userDocRef = firestore.collection("users").doc(currentUser.uid);
        
        return userDocRef.get()
            .then((docSnap) => {
                if (docSnap.exists) {
                    const data = docSnap.data();
                    const categoryData = data.categories && data.categories[category];
                    
                    if (categoryData) {
                        console.log(`Progress for category "${category}" loaded successfully`);
                        return categoryData;
                    } else {
                        console.log(`No progress found for category "${category}"`);
                        return {};
                    }
                } else {
                    console.log("No user data found");
                    return {};
                }
            })
            .catch((error) => {
                console.error(`Error loading progress for category "${category}":`, error);
                throw error;
            });
    }
    
    // Get current user
    function getCurrentUser() {
        return currentUser;
    }
    
    // Initialize auth system on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Public API
    return {
        onAuthStateChanged: onAuthStateChanged,
        getCurrentUser: getCurrentUser,
        signInWithEmailPassword: signInWithEmailPassword,
        signInWithGoogle: signInWithGoogle,
        createAccountWithEmailPassword: createAccountWithEmailPassword,
        sendPasswordResetEmail: sendPasswordResetEmail,
        sendEmailVerification: sendEmailVerification,
        signOut: signOut,
        saveUserProgress: saveUserProgress,
        saveCategoryProgress: saveCategoryProgress,
        loadUserProgress: loadUserProgress,
        loadCategoryProgress: loadCategoryProgress
    };
})();