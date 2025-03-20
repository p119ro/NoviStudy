const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const { email, name, code } = data;
    
    if (!email || !name || !code) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ success: false, message: "Missing required fields" }) 
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #3498db;">${process.env.APP_NAME || 'NoviStudy'}</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Email Verification</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>Hello ${name || 'User'},</p>
          <p>Thank you for signing up with ${process.env.APP_NAME || 'NoviStudy'}. To complete your registration, please use the verification code below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${code}
            </div>
          </div>
          
          <p>This code will expire in ${process.env.VERIFICATION_EXPIRY_HOURS || 24} hours.</p>
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'NoviStudy'}. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `${process.env.APP_NAME || 'NoviStudy'} <${process.env.EMAIL_ADDRESS}>`,
      to: email,
      subject: `${process.env.APP_NAME || 'NoviStudy'} - Verification Code`,
      html: htmlContent
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        messageId: info.messageId
      })
    };
  } catch (error) {
    console.error("Email sending error:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: "Failed to send verification email",
        error: error.message
      })
    };
  }
};