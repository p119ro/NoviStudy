// env-loader.js - Simple environment variable loader for browser
(function() {
    // Container for environment variables
    window.ENV = {};
    
    // Function to load environment variables from .env file
    function loadEnvironmentVariables() {
        // Fetch the .env file
        fetch('./.env')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load .env file: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                // Parse .env file content
                const lines = text.split('\n');
                lines.forEach(line => {
                    // Skip empty lines and comments
                    if (!line || line.startsWith('#')) return;
                    
                    // Parse variable assignment
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        const key = match[1];
                        // Remove quotes if present
                        let value = match[2] || '';
                        value = value.replace(/^['"]|['"]$/g, '');
                        
                        // Store in ENV object
                        window.ENV[key] = value;
                    }
                });
                
                console.log('Environment variables loaded');
                
                // Dispatch event to notify that env vars are loaded
                const event = new Event('env-loaded');
                window.dispatchEvent(event);
            })
            .catch(error => {
                console.error('Error loading environment variables:', error);
                // Use fallback values
                window.ENV = {
                    ADMIN_USERNAME: 'p119ro',
                    ADMIN_PASSWORD: 'Vuppala123',
                    APP_NAME: 'NoviStudy',
                    VERIFICATION_EXPIRY_HOURS: '24'
                };
                
                // Still dispatch event with fallback values
                const event = new Event('env-loaded');
                window.dispatchEvent(event);
            });
    }
    
    // Load variables immediately
    loadEnvironmentVariables();
})();