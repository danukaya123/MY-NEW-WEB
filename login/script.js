// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2vYzivm2Gbgl_ee0t81d6r5GPHeI4Gqs",
    authDomain: "quizontal-de977.firebaseapp.com",
    projectId: "quizontal-de977",
    storageBucket: "quizontal-de977.firebasestorage.app",
    messagingSenderId: "448533191404",
    appId: "1:448533191404:web:f13787dc074def891fe3c9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Your Google OAuth Client ID
const GOOGLE_CLIENT_ID = '1053520824725-at3vm404ps6i8v3ur946lh9ghuaiards.apps.googleusercontent.com';

// DOM Elements
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Check authentication status immediately
checkAuthStatus();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Google Sign-In...');
    initializeGoogleSignIn();
    addGoogleAuthButtons();
});

// Toggle between sign-in and sign-up forms
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Add Google auth buttons to forms
function addGoogleAuthButtons() {
    console.log('Adding Google auth buttons...');
    
    // Add Google Sign-In button to login form
    const loginForm = document.querySelector('.sign-in form');
    const loginGoogleDiv = document.createElement('div');
    loginGoogleDiv.id = 'googleLoginBtn';
    loginGoogleDiv.style.marginBottom = '15px';
    loginGoogleDiv.style.textAlign = 'center';
    
    const socialIcons = loginForm.querySelector('.social-icons');
    if (socialIcons) {
        loginForm.insertBefore(loginGoogleDiv, socialIcons);
    } else {
        // If social icons not found, add after the span
        const span = loginForm.querySelector('span');
        if (span) {
            loginForm.insertBefore(loginGoogleDiv, span.nextSibling);
        } else {
            loginForm.prepend(loginGoogleDiv);
        }
    }

    // Add Google Sign-Up button to signup form
    const signupForm = document.querySelector('.sign-up form');
    const signupGoogleDiv = document.createElement('div');
    signupGoogleDiv.id = 'googleSignupBtn';
    signupGoogleDiv.style.marginBottom = '15px';
    signupGoogleDiv.style.textAlign = 'center';
    
    const signupSocialIcons = signupForm.querySelector('.social-icons');
    if (signupSocialIcons) {
        signupForm.insertBefore(signupGoogleDiv, signupSocialIcons);
    } else {
        const signupSpan = signupForm.querySelector('span');
        if (signupSpan) {
            signupForm.insertBefore(signupGoogleDiv, signupSpan.nextSibling);
        } else {
            signupForm.prepend(signupGoogleDiv);
        }
    }
    
    console.log('Google auth buttons added');
}

// Initialize Google Sign In
function initializeGoogleSignIn() {
    console.log('Initializing Google Sign-In...');
    
    // Check if Google library is loaded
    if (typeof google === 'undefined') {
        console.error('Google Sign-In library not loaded, retrying...');
        setTimeout(initializeGoogleSignIn, 500);
        return;
    }
    
    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false
        });
        
        console.log('Google Sign-In initialized');
        
        // Render buttons with delay to ensure DOM is ready
        setTimeout(renderGoogleButtons, 100);
        
    } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
    }
}

// Render Google buttons
function renderGoogleButtons() {
    const loginBtn = document.getElementById('googleLoginBtn');
    const signupBtn = document.getElementById('googleSignupBtn');
    
    if (loginBtn && google.accounts.id) {
        try {
            google.accounts.id.renderButton(loginBtn, {
                theme: "filled_blue", 
                size: "large", 
                text: "signin_with", 
                width: "100%",
                type: "standard"
            });
            console.log('Login button rendered');
        } catch (error) {
            console.error('Error rendering login button:', error);
        }
    }
    
    if (signupBtn && google.accounts.id) {
        try {
            google.accounts.id.renderButton(signupBtn, {
                theme: "filled_blue", 
                size: "large", 
                text: "signup_with", 
                width: "100%",
                type: "standard"
            });
            console.log('Signup button rendered');
        } catch (error) {
            console.error('Error rendering signup button:', error);
        }
    }
}

// Handle Google Sign In
async function handleGoogleSignIn(response) {
    console.log('Google Sign-In response received');
    
    try {
        // Show loading state
        document.body.style.cursor = 'wait';
        
        // Decode the JWT token to get user info
        const credential = response.credential;
        const payload = JSON.parse(atob(credential.split('.')[1]));
        
        const userData = {
            uid: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            email_verified: payload.email_verified,
            loginTime: new Date().toISOString()
        };
        
        console.log('User data:', userData);
        
        // Store user data
        const storeSuccess = await storeUserData(userData);
        
        if (storeSuccess) {
            // Store session data
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('loginTime', new Date().toISOString());
            
            console.log('Authentication successful, redirecting to dashboard...');
            
            // Redirect to dashboard
            redirectToDashboard();
        } else {
            throw new Error('Failed to store user data');
        }
        
    } catch (error) {
        console.error('Google Sign-In error:', error);
        alert('Authentication failed: ' + error.message);
    } finally {
        document.body.style.cursor = 'default';
    }
}

// Store user data (Firestore with localStorage fallback)
async function storeUserData(userData) {
    // First try Firebase Firestore
    const firebaseSuccess = await storeUserInFirebase(userData);
    if (firebaseSuccess) return true;
    
    // Fallback to localStorage
    return storeUserInLocalStorage(userData);
}

// Store user data in Firebase Firestore
async function storeUserInFirebase(userData) {
    try {
        const userRef = db.collection('users').doc(userData.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            // Update existing user
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                name: userData.name,
                email: userData.email,
                picture: userData.picture
            });
            console.log('User updated in Firebase');
        } else {
            // Create new user
            await userRef.set({
                uid: userData.uid,
                name: userData.name,
                email: userData.email,
                picture: userData.picture,
                email_verified: userData.email_verified,
                joined: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'starter',
                status: 'active'
            });
            console.log('New user created in Firebase');
        }
        return true;
    } catch (error) {
        console.error('Firebase error:', error);
        return false;
    }
}

// Fallback to localStorage
function storeUserInLocalStorage(userData) {
    try {
        let users = JSON.parse(localStorage.getItem('quizontalUsers') || '{}');
        
        if (users[userData.uid]) {
            // Update existing user
            users[userData.uid].lastLogin = new Date().toISOString();
            users[userData.uid].name = userData.name;
            users[userData.uid].email = userData.email;
            users[userData.uid].picture = userData.picture;
            console.log('User updated in localStorage');
        } else {
            // Create new user
            users[userData.uid] = {
                ...userData,
                joined: new Date().toISOString(),
                plan: 'starter',
                status: 'active'
            };
            console.log('New user created in localStorage');
        }
        
        localStorage.setItem('quizontalUsers', JSON.stringify(users));
        return true;
    } catch (error) {
        console.error('LocalStorage error:', error);
        return false;
    }
}

// Check if user is already logged in
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    const loginTime = localStorage.getItem('loginTime');
    
    // Check if login is within last 30 days
    if (isLoggedIn === 'true' && userData && loginTime) {
        const loginDate = new Date(loginTime);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - loginDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
            console.log('User already logged in, redirecting to dashboard...');
            redirectToDashboard();
        } else {
            // Session expired
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginTime');
            console.log('Session expired');
        }
    }
}

// Redirect to dashboard
function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

// Handle regular form submissions
document.querySelector('.sign-up form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Please use Google Sign-In for registration. Email/password registration is not available yet.');
});

document.querySelector('.sign-in form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Please use Google Sign-In for login. Email/password login is not available yet.');
});

// Make logout function available globally
window.logout = function() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
};
