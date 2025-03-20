// email-service.js - Client-side email sending utility
(function() {
    // Initialize SMTP with null credentials - will be set once ENV is loaded
    let emailConfig = {
        initialized: false
    };
    
    // Public API for email service
    window.EmailService = {
        initialize,
        sendVerificationEmail,
        sendPasswordResetEmail
    };
    
    // Listen for environment variables to be loaded
    window.addEventListener('env-loaded', function() {
        console.log('Environment ready, initializing email service');
        
        // Only proceed if we have required environment variables
        if (!window.ENV || !window.ENV.EMAIL_ADDRESS || !window.ENV.EMAIL_APP_PASSWORD) {
            console.error('Email service initialization failed: Missing required environment variables');
            return;
        }
        
        // Initialize with environment variables
        initialize();
    });
    
    /**
     * Initialize Email Service with environment variables
     */
    // email-service.js - update the initialize function
    function initialize() {
        if (!window.ENV) {
            console.error("Email service cannot be initialized: Environment variables not loaded");
            return false;
        }
        
        if (!window.ENV.EMAIL_ADDRESS || !window.ENV.EMAIL_APP_PASSWORD) {
            console.error("Email service cannot be initialized: Missing email credentials in environment variables");
            return false;
        }
        
        // Check if SMTP.js is loaded
        if (typeof Email === 'undefined') {
            console.error("Email service cannot be initialized: SMTP.js library not loaded");
            return false;
        }
        
        try {
            emailConfig = {
                initialized: true,
                host: 'smtp.gmail.com',
                username: window.ENV.EMAIL_ADDRESS,
                password: window.ENV.EMAIL_APP_PASSWORD,
                port: window.ENV.EMAIL_PORT || 587,
                secure: false
            };
            
            // Initialize SMTP.js
            Email.init({
                host: emailConfig.host,
                username: emailConfig.username,
                password: emailConfig.password,
                port: emailConfig.port,
                secure: emailConfig.secure
            });
            
            console.log("Email service initialized successfully");
            return true;
        } catch (error) {
            console.error("Failed to initialize email service:", error);
            emailConfig.initialized = false;
            emailConfig.initError = error.message;
            return false;
        }
    }
    
    /**
     * Send verification email with code
     * @param {Object} params - Email parameters
     * @param {string} params.to - Recipient email
     * @param {string} params.name - Recipient name
     * @param {string} params.code - Verification code
     * @param {function} callback - Callback function(success, errorMsg)
     */
    function sendVerificationEmail(params, callback) {
        if (!emailConfig.initialized) {
            console.error("Email service not initialized");
            callback(false, "Email service not initialized");
            return;
        }
        
        // Create verification email content
        const appName = window.ENV.APP_NAME || 'NoviStudy';
        const expiryHours = window.ENV.VERIFICATION_EXPIRY_HOURS || 24;
        
        // HTML email template
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #3498db;">${appName}</h1>
                    <p style="color: #7f8c8d; font-size: 16px;">Email Verification</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <p>Hello ${params.name || 'User'},</p>
                    <p>Thank you for signing up with ${appName}. To complete your registration, please use the verification code below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                            ${params.code}
                        </div>
                    </div>
                    
                    <p>This code will expire in ${expiryHours} hours.</p>
                    <p>If you didn't create an account with us, you can safely ignore this email.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
                    <p>This is an automated email, please do not reply.</p>
                </div>
            </div>
        `;
        
        // Plain text fallback
        const textContent = `
            ${appName} - Email Verification
            
            Hello ${params.name || 'User'},
            
            Thank you for signing up with ${appName}. To complete your registration, please use the verification code below:
            
            ${params.code}
            
            This code will expire in ${expiryHours} hours.
            
            If you didn't create an account with us, you can safely ignore this email.
            
            © ${new Date().getFullYear()} ${appName}. All rights reserved.
            This is an automated email, please do not reply.
        `;
        
        // Attempt to send the email
        try {
            Email.send({
                Host: emailConfig.host,
                Username: emailConfig.username,
                Password: emailConfig.password,
                Port: emailConfig.port,
                Secure: emailConfig.secure,
                To: params.to,
                From: `${appName} <${emailConfig.username}>`,
                Subject: `${appName} - Verification Code`,
                Body: htmlContent,
                AlternativeText: textContent
            }).then(function(message) {
                console.log("Email sent successfully:", message);
                callback(true);
            }).catch(function(error) {
                console.error("Error sending email:", error);
                callback(false, error);
            });
        } catch(e) {
            console.error("Exception sending email:", e);
            callback(false, e.message);
        }
    }
    
    /**
     * Send password reset email
     * @param {Object} params - Email parameters
     * @param {string} params.to - Recipient email
     * @param {string} params.name - Recipient name
     * @param {string} params.password - New password
     * @param {function} callback - Callback function(success, errorMsg)
     */
    function sendPasswordResetEmail(params, callback) {
        if (!emailConfig.initialized) {
            console.error("Email service not initialized");
            callback(false, "Email service not initialized");
            return;
        }
        
        // Create password reset email content
        const appName = window.ENV.APP_NAME || 'NoviStudy';
        
        // HTML email template
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #3498db;">${appName}</h1>
                    <p style="color: #7f8c8d; font-size: 16px;">Password Reset</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <p>Hello ${params.name || 'User'},</p>
                    <p>Your password has been reset. You can now log in with your new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 18px; font-weight: bold;">
                            ${params.password}
                        </div>
                    </div>
                    
                    <p>For security reasons, we recommend changing your password after logging in.</p>
                    <p>If you didn't request a password reset, please contact us immediately.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
                    <p>This is an automated email, please do not reply.</p>
                </div>
            </div>
        `;
        
        // Plain text fallback
        const textContent = `
            ${appName} - Password Reset
            
            Hello ${params.name || 'User'},
            
            Your password has been reset. You can now log in with your new password:
            
            ${params.password}
            
            For security reasons, we recommend changing your password after logging in.
            If you didn't request a password reset, please contact us immediately.
            
            © ${new Date().getFullYear()} ${appName}. All rights reserved.
            This is an automated email, please do not reply.
        `;
        
        // Attempt to send the email
        try {
            Email.send({
                Host: emailConfig.host,
                Username: emailConfig.username,
                Password: emailConfig.password,
                Port: emailConfig.port,
                Secure: emailConfig.secure,
                To: params.to,
                From: `${appName} <${emailConfig.username}>`,
                Subject: `${appName} - Password Reset`,
                Body: htmlContent,
                AlternativeText: textContent
            }).then(function(message) {
                console.log("Password reset email sent successfully:", message);
                callback(true);
            }).catch(function(error) {
                console.error("Error sending password reset email:", error);
                callback(false, error);
            });
        } catch(e) {
            console.error("Exception sending password reset email:", e);
            callback(false, e.message);
        }
    }
})();