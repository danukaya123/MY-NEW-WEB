// Firebase configuration (replace with your Firebase project config)
        const firebaseConfig = {
            apiKey: "AIzaSyD2vYzivm2Gbgl_ee0t81d6r5GPHeI4Gqs",
            authDomain: "quizontal-de977.firebaseapp.com",
            projectId: "quizontal-de977",
            storageBucket: "quizontal-de977.firebasestorage.app",
            messagingSenderId: "448533191404",
            appId: "1:448533191404:web:f13787dc074def891fe3c9"
        };

// Initialize Firebase (only for database, not authentication)
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Google OAuth Configuration (replace with your Google Client ID)
const GOOGLE_CLIENT_ID = '1053520824725-at3vm404ps6i8v3ur946lh9ghuaiards.apps.googleusercontent.com';

// Existing DOM elements
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Initialize Google Sign-In
let googleAuth;

function initializeGoogleAuth() {
    googleAuth = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'profile email',
        callback: (response) => {
            if (response.access_token) {
                handleGoogleSignIn(response.access_token);
            }
        }
    });
}

// Add Google auth buttons when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addGoogleAuthButtons();
    initializeGoogleAuth();
});

// Toggle between sign-in and sign-up forms
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Function to add Google auth buttons to both forms
function addGoogleAuthButtons() {
    // Add to sign-up form
    const signUpForm = document.querySelector('.sign-up form');
    const signUpGoogleBtn = createGoogleButton('Sign up with Google');
    signUpForm.insertBefore(signUpGoogleBtn, signUpForm.querySelector('.social-icons'));
    
    // Add to sign-in form
    const signInForm = document.querySelector('.sign-in form');
    const signInGoogleBtn = createGoogleButton('Sign in with Google');
    signInForm.insertBefore(signInGoogleBtn, signInForm.querySelector('.social-icons'));
    
    // Add event listeners to Google buttons
    signUpGoogleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithGoogle('signup');
    });
    
    signInGoogleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithGoogle('signin');
    });
}

// Function to create Google auth button
function createGoogleButton(text) {
    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className = 'google-auth-btn';
    googleBtn.innerHTML = `<i class="fa-brands fa-google"></i> ${text}`;
    googleBtn.style.cssText = `
        background-color: #db4437;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        width: 100%;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: background-color 0.3s;
    `;
    
    googleBtn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#c23321';
    });
    
    googleBtn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#db4437';
    });
    
    return googleBtn;
}

// Function to trigger Google Sign-In
function signInWithGoogle(action) {
    // Store the action (signup/signin) in localStorage to use after auth
    localStorage.setItem('authAction', action);
    
    // Request access token
    googleAuth.requestAccessToken();
}

// Handle Google Sign-In response
async function handleGoogleSignIn(accessToken) {
    try {
        // Get user info from Google API
        const userInfo = await getUserInfoFromGoogle(accessToken);
        
        // Store user data in Firebase
        await storeUserData(userInfo);
        
        // Redirect to dashboard
        redirectToDashboard();
        
    } catch (error) {
        console.error('Google authentication error:', error);
        showErrorMessage('Authentication failed. Please try again.');
    }
}

// Get user info from Google API
async function getUserInfoFromGoogle(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch user info from Google');
    }
    
    const userData = await response.json();
    
    return {
        uid: userData.sub, // Google user ID
        displayName: userData.name,
        email: userData.email,
        photoURL: userData.picture,
        emailVerified: userData.email_verified,
        provider: 'google',
        accessToken: accessToken
    };
}

// Function to store user data in Firebase
async function storeUserData(userData) {
    const authAction = localStorage.getItem('authAction') || 'signin';
    
    const userRecord = {
        uid: userData.uid,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified,
        provider: userData.provider,
        lastLogin: Date.now(),
        createdAt: authAction === 'signup' ? Date.now() : null,
        updatedAt: Date.now()
    };
    
    try {
        // Store user data in Firebase Realtime Database
        await database.ref('users/' + userData.uid).set(userRecord);
        console.log('User data stored successfully');
        
        // Store user data in localStorage for session management
        localStorage.setItem('currentUser', JSON.stringify(userRecord));
        localStorage.setItem('isAuthenticated', 'true');
        
    } catch (error) {
        console.error('Error storing user data:', error);
        throw error;
    }
}

// Redirect to dashboard
function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

// Function to show error message
function showErrorMessage(message) {
    alert(`Error: ${message}`);
}

// Handle regular form submissions (email/password)
document.querySelector('.sign-up form').addEventListener('submit', function(e) {
    e.preventDefault();
    handleEmailSignUp();
});

document.querySelector('.sign-in form').addEventListener('submit', function(e) {
    e.preventDefault();
    handleEmailSignIn();
});

// Handle email/password sign up
function handleEmailSignUp() {
    const name = document.querySelector('.sign-up input[type="text"]').value;
    const email = document.querySelector('.sign-up input[type="email"]').value;
    const password = document.querySelector('.sign-up input[type="password"]').value;
    
    // Simple validation
    if (!name || !email || !password) {
        showErrorMessage('Please fill in all fields');
        return;
    }
    
    // For demo purposes, create a simple user record
    const userData = {
        uid: generateUserId(),
        displayName: name,
        email: email,
        provider: 'email',
        lastLogin: Date.now(),
        createdAt: Date.now()
    };
    
    // Store in Firebase
    storeUserData(userData)
        .then(() => {
            redirectToDashboard();
        })
        .catch(error => {
            showErrorMessage('Registration failed. Please try again.');
        });
}

// Handle email/password sign in
function handleEmailSignIn() {
    const email = document.querySelector('.sign-in input[type="email"]').value;
    const password = document.querySelector('.sign-in input[type="password"]').value;
    
    // Simple validation
    if (!email || !password) {
        showErrorMessage('Please fill in all fields');
        return;
    }
    
    // For demo purposes, you would typically verify against your backend
    // Here we'll just create a simple session
    const userData = {
        uid: generateUserId(),
        email: email,
        provider: 'email',
        lastLogin: Date.now()
    };
    
    // Store in Firebase and redirect
    storeUserData(userData)
        .then(() => {
            redirectToDashboard();
        })
        .catch(error => {
            showErrorMessage('Login failed. Please try again.');
        });
}

// Generate simple user ID for email users
function generateUserId() {
    return 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Check if user is already authenticated
function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
        // Optionally redirect to dashboard if already logged in
        // redirectToDashboard();
    }
}

// Initialize auth status check
checkAuthStatus();
