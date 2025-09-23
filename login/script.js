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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Your Google OAuth Client ID
const GOOGLE_CLIENT_ID = '1053520824725-at3vm404ps6i8v3ur946lh9ghuaiards.apps.googleusercontent.com';

// DOM Elements
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Google Sign-In...');
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
    // Add Google Sign-In button to login form
    const loginForm = document.querySelector('.sign-in form');
    const loginGoogleDiv = document.createElement('div');
    loginGoogleDiv.id = 'googleLoginBtn';
    loginGoogleDiv.style.marginBottom = '15px';
    loginForm.insertBefore(loginGoogleDiv, loginForm.querySelector('.social-icons'));

    // Add Google Sign-Up button to signup form
    const signupForm = document.querySelector('.sign-up form');
    const signupGoogleDiv = document.createElement('div');
    signupGoogleDiv.id = 'googleSignupBtn';
    signupGoogleDiv.style.marginBottom = '15px';
    signupForm.insertBefore(signupGoogleDiv, signupForm.querySelector('.social-icons'));
}

// Initialize Google Sign In
function initializeGoogleSignIn() {
    if (typeof google === 'undefined') {
        console.error('Google Sign-In library not loaded');
        setTimeout(initializeGoogleSignIn, 100); // Retry after 100ms
        return;
    }
    
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false
    });
    
    // Render buttons
    const loginBtn = document.getElementById('googleLoginBtn');
    const signupBtn = document.getElementById('googleSignupBtn');
    
    if (loginBtn) {
        google.accounts.id.renderButton(loginBtn, {
            theme: "filled_blue", 
            size: "large", 
            text: "signin_with", 
            width: "100%",
            type: "standard"
        });
    }
    
    if (signupBtn) {
        google.accounts.id.renderButton(signupBtn, {
            theme: "filled_blue", 
            size: "large", 
            text: "signup_with", 
            width: "100%",
            type: "standard"
        });
    }
    
    console.log('Google Sign-In initialized successfully');
}

// Handle Google Sign In
async function handleGoogleSignIn(response) {
    console.log('Google Sign-In response received');
    showLoadingState(true);
    
    try {
        // Decode the JWT token to get user info
        const credential = response.credential;
        const payload = JSON.parse(atob(credential.split('.')[1]));
        
        const userData = {
            uid: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            email_verified: payload.email_verified
        };
        
        console.log('User data extracted:', userData);
        
        // Check if user exists
        const existingUser = await getUserData(userData.uid);
        const isNewUser = !existingUser;
        
        console.log('Is new user?', isNewUser);
        
        // Store user data in Firebase
        const storeSuccess = await storeUserInFirebase(userData, isNewUser);
        
        if (storeSuccess) {
            // Store session data
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            
            showLoadingState(false);
            
            // Redirect to dashboard
            redirectToDashboard();
        } else {
            throw new Error('Failed to store user data');
        }
    } catch (error) {
        console.error('Google Sign-In error:', error);
        showLoadingState(false);
        alert('Authentication failed. Please try again: ' + error.message);
    }
}

// Store user data in Firebase Firestore
async function storeUserInFirebase(userData, isNewUser = false) {
    try {
        const userRef = db.collection('users').doc(userData.uid);
        
        if (isNewUser) {
            // Create new user document
            await userRef.set({
                name: userData.name,
                email: userData.email,
                picture: userData.picture || '',
                joined: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                services: {
                    whatsappBots: 0,
                    websites: 0,
                    logos: 0,
                    marketingMaterials: 0,
                    youtubeDownloads: 0
                },
                plan: 'starter',
                currentRank: 'New User'
            });
            console.log('New user stored in Firebase');
        } else {
            // Update existing user
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User data updated in Firebase');
        }
        
        return true;
    } catch (error) {
        console.error('Error storing user data in Firebase:', error);
        // Fallback to localStorage
        return storeUserInLocalStorage(userData, isNewUser);
    }
}

// Fallback to localStorage
function storeUserInLocalStorage(userData, isNewUser) {
    try {
        let users = JSON.parse(localStorage.getItem('appUsers') || '{}');
        users[userData.uid] = {
            ...userData,
            joined: isNewUser ? new Date().toISOString() : users[userData.uid]?.joined,
            lastLogin: new Date().toISOString(),
            services: users[userData.uid]?.services || {
                whatsappBots: 0,
                websites: 0,
                logos: 0,
                marketingMaterials: 0,
                youtubeDownloads: 0
            },
            plan: users[userData.uid]?.plan || 'starter',
            currentRank: users[userData.uid]?.currentRank || 'New User'
        };
        localStorage.setItem('appUsers', JSON.stringify(users));
        console.log('User data stored in localStorage');
        return true;
    } catch (error) {
        console.error('Error storing user data in localStorage:', error);
        return false;
    }
}

// Get user data from Firebase or localStorage
async function getUserData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
    } catch (error) {
        console.log('Firebase unavailable, trying localStorage');
    }
    
    const users = JSON.parse(localStorage.getItem('appUsers') || '{}');
    return users[uid] || null;
}

// Redirect to dashboard
function redirectToDashboard() {
    console.log('Redirecting to dashboard...');
    window.location.href = 'dashboard.html';
}

// Show/hide loading state
function showLoadingState(show) {
    const buttons = document.querySelectorAll('.g_id_signin');
    buttons.forEach(button => {
        button.style.opacity = show ? '0.6' : '1';
        button.style.pointerEvents = show ? 'none' : 'all';
    });
    
    if (show) {
        // You can add a spinner here if needed
        console.log('Showing loading state...');
    } else {
        console.log('Hiding loading state...');
    }
}

// Check if user is already logged in
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (isLoggedIn === 'true' && userData) {
        console.log('User already logged in, redirecting to dashboard...');
        redirectToDashboard();
    }
}

// Handle regular form submissions (optional)
document.querySelector('.sign-up form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Please use Google Sign-Up for registration.');
});

document.querySelector('.sign-in form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Please use Google Sign-In for login.');
});

// Initialize auth check
checkAuthStatus();
