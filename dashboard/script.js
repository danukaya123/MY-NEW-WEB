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
const storage = firebase.storage();

let currentUser = null;
let userProfile = null;

// Check authentication status
async function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !userData) {
        window.location.href = '/login/index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    await loadUserProfile();
    displayUserInfo();
    checkProfileCompletion();
}

// Load user profile from Firestore
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userProfile = userDoc.data();
            updateUIWithProfileData();
        } else {
            // Create initial profile
            userProfile = {
                uid: currentUser.uid,
                name: currentUser.name,
                email: currentUser.email,
                picture: currentUser.picture,
                email_verified: currentUser.email_verified || false,
                joined: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'starter',
                status: 'active',
                profileComplete: false
            };
            
            await db.collection('users').doc(currentUser.uid).set(userProfile);
        }
        
        // Update last login
        await db.collection('users').doc(currentUser.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile data', 'error');
    }
}

// Update UI with profile data
function updateUIWithProfileData() {
    if (!userProfile) return;
    
    // Update navbar
    document.getElementById('nav-user-name').textContent = userProfile.name || 'User';
    if (userProfile.picture) {
        document.getElementById('nav-avatar').src = userProfile.picture;
    }
    
    // Update profile section
    document.getElementById('profile-name').textContent = userProfile.name || 'User';
    document.getElementById('profile-email').textContent = userProfile.email || 'No email';
    document.getElementById('full-name').value = userProfile.name || '';
    document.getElementById('phone').value = userProfile.phone || '';
    document.getElementById('company').value = userProfile.company || '';
    document.getElementById('position').value = userProfile.position || '';
    document.getElementById('bio').value = userProfile.bio || '';
    
    // Update avatar
    if (userProfile.picture) {
        document.getElementById('profile-avatar').src = userProfile.picture;
    }
    
    // Update dates
    if (userProfile.joined) {
        const joinedDate = userProfile.joared.toDate ? userProfile.joined.toDate() : new Date(userProfile.joined);
        document.getElementById('joined-date').textContent = joinedDate.toLocaleDateString();
    }
    
    document.getElementById('last-login').textContent = new Date().toLocaleDateString();
    
    // Update account info
    document.getElementById('account-plan').textContent = userProfile.plan || 'Starter';
    document.getElementById('email-verified').textContent = userProfile.email_verified ? 'Yes' : 'No';
    
    // Calculate profile completion percentage
    const completion = calculateProfileCompletion();
    document.getElementById('profile-complete').textContent = completion + '%';
    
    // Update progress bar
    document.getElementById('profile-progress').style.width = completion + '%';
}

// Calculate profile completion percentage
function calculateProfileCompletion() {
    if (!userProfile) return 0;
    
    let completed = 0;
    const totalFields = 6; // name, email, phone, company, position, bio
    
    if (userProfile.name) completed++;
    if (userProfile.email) completed++;
    if (userProfile.phone) completed++;
    if (userProfile.company) completed++;
    if (userProfile.position) completed++;
    if (userProfile.bio) completed++;
    
    return Math.round((completed / totalFields) * 100);
}

// Save profile data to Firestore
async function saveProfileData(formData) {
    try {
        const updates = {
            ...formData,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            profileComplete: calculateProfileCompletion() >= 80
        };
        
        // Remove fullName and use name instead for consistency
        if (updates.fullName) {
            updates.name = updates.fullName;
            delete updates.fullName;
        }
        
        await db.collection('users').doc(currentUser.uid).update(updates);
        
        // Update local profile data
        userProfile = { ...userProfile, ...updates };
        
        // Update UI
        updateUIWithProfileData();
        
        // Add activity log
        await addActivity('Profile updated');
        
        showNotification('Profile updated successfully!', 'success');
        return true;
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error saving profile data', 'error');
        return false;
    }
}

// Upload avatar to Firebase Storage
async function uploadAvatar(file) {
    try {
        const storageRef = storage.ref();
        const avatarRef = storageRef.child(`avatars/${currentUser.uid}/${file.name}`);
        const snapshot = await avatarRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // Update profile with new avatar URL
        await db.collection('users').doc(currentUser.uid).update({
            picture: downloadURL,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userProfile.picture = downloadURL;
        updateUIWithProfileData();
        
        // Add activity log
        await addActivity('Profile picture updated');
        
        showNotification('Avatar updated successfully!', 'success');
        return downloadURL;
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification('Error uploading avatar', 'error');
        return null;
    }
}

// Remove avatar
async function removeAvatar() {
    if (!confirm('Are you sure you want to remove your avatar?')) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            picture: '',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userProfile.picture = '';
        updateUIWithProfileData();
        
        // Add activity log
        await addActivity('Profile picture removed');
        
        showNotification('Avatar removed successfully!', 'success');
    } catch (error) {
        console.error('Error removing avatar:', error);
        showNotification('Error removing avatar', 'error');
    }
}

// Add activity log
async function addActivity(activity) {
    try {
        await db.collection('activities').add({
            userId: currentUser.uid,
            activity: activity,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'profile_update'
        });
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

// Profile completion modal functionality
let currentStep = 1;
const totalSteps = 2;

function nextStep() {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateModalButtons();
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateModalButtons();
    }
}

function updateModalButtons() {
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    const completeBtn = document.querySelector('.btn-complete');
    
    prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
    completeBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
}

// Check if profile needs completion
function checkProfileCompletion() {
    if (!userProfile || !userProfile.profileComplete) {
        setTimeout(() => {
            document.getElementById('profile-modal').style.display = 'block';
        }, 2000);
    }
}

// Initialize dashboard
function initializeDashboard() {
    // ... (keep all your existing dashboard functionality)
    
    // Add avatar upload handler
    document.getElementById('avatar-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            uploadAvatar(file);
        }
    });
    
    // Add bio character counter
    document.getElementById('bio').addEventListener('input', function() {
        document.getElementById('bio-char-count').textContent = this.value.length;
    });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        window.location.href = 'https://quizontal.cc';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeDashboard();
});

// Make functions globally available
window.removeAvatar = removeAvatar;
window.logout = logout;
window.nextStep = nextStep;
window.prevStep = prevStep;
