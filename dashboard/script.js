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
let currentStep = 1;
const totalSteps = 2;

// Check authentication status
async function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    await loadUserProfile();
    displayUserInfo();
    
    // Check if profile needs completion (show modal if profile is incomplete)
    if (!userProfile.profileComplete) {
        setTimeout(() => {
            showProfileModal();
        }, 1000);
    }
}

// Load user profile from Firestore
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userProfile = userDoc.data();
        } else {
            // Create initial profile
            userProfile = {
                uid: currentUser.uid,
                name: currentUser.name,
                email: currentUser.email,
                picture: currentUser.picture,
                email_verified: currentUser.email_verified || false,
                joined: new Date(),
                lastLogin: new Date(),
                plan: 'starter',
                status: 'active',
                profileComplete: false
            };
            
            await db.collection('users').doc(currentUser.uid).set(userProfile);
        }
        
        // Update last login
        await db.collection('users').doc(currentUser.uid).update({
            lastLogin: new Date()
        });
        
        updateUIWithProfileData();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile data', 'error');
    }
}

// Update UI with profile data
function updateUIWithProfileData() {
    if (!userProfile) return;
    
    // Update navbar
    const navUserName = document.getElementById('nav-user-name');
    const navAvatar = document.getElementById('nav-avatar');
    
    if (navUserName) navUserName.textContent = userProfile.name || 'User';
    if (navAvatar && userProfile.picture) {
        navAvatar.src = userProfile.picture;
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
        const joinedDate = userProfile.joined.toDate ? userProfile.joined.toDate() : new Date(userProfile.joined);
        document.getElementById('joined-date').textContent = joinedDate.toLocaleDateString();
    }
    
    document.getElementById('last-login').textContent = new Date().toLocaleDateString();
    
    // Update account info
    document.getElementById('account-plan').textContent = userProfile.plan || 'Starter';
    
    // Calculate profile completion percentage
    const completion = calculateProfileCompletion();
    document.getElementById('profile-complete').textContent = completion + '%';
}

// Calculate profile completion percentage
function calculateProfileCompletion() {
    if (!userProfile) return 0;
    
    let completed = 0;
    const fields = ['name', 'email', 'phone', 'company', 'position', 'bio'];
    
    fields.forEach(field => {
        if (userProfile[field] && userProfile[field].toString().trim() !== '') {
            completed++;
        }
    });
    
    return Math.round((completed / fields.length) * 100);
}

// Save profile data to Firestore
async function saveProfileData(formData) {
    try {
        const updates = {
            ...formData,
            lastUpdated: new Date(),
            profileComplete: calculateProfileCompletion() >= 80
        };
        
        // Use name instead of fullName for consistency
        if (updates.fullName) {
            updates.name = updates.fullName;
            delete updates.fullName;
        }
        
        await db.collection('users').doc(currentUser.uid).update(updates);
        
        // Update local profile data
        userProfile = { ...userProfile, ...updates };
        
        // Update UI
        updateUIWithProfileData();
        
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
            lastUpdated: new Date()
        });
        
        userProfile.picture = downloadURL;
        updateUIWithProfileData();
        
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
            lastUpdated: new Date()
        });
        
        userProfile.picture = '';
        updateUIWithProfileData();
        
        showNotification('Avatar removed successfully!', 'success');
    } catch (error) {
        console.error('Error removing avatar:', error);
        showNotification('Error removing avatar', 'error');
    }
}

// Show profile completion modal
function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.display = 'block';
        updateModalProgress();
    }
}

// Update modal progress bar
function updateModalProgress() {
    const progress = document.getElementById('profile-progress');
    const progressPercentage = (currentStep / totalSteps) * 100;
    progress.style.width = progressPercentage + '%';
}

// Modal navigation functions
function nextStep() {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateModalButtons();
        updateModalProgress();
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.add('active');
        updateModalButtons();
        updateModalProgress();
    }
}

function updateModalButtons() {
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    const completeBtn = document.querySelector('.btn-complete');
    
    if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
    if (completeBtn) completeBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
}

// Display user information
function displayUserInfo() {
    if (!currentUser) return;
    
    const profileName = document.querySelector('.profile-name');
    const navAvatar = document.getElementById('nav-avatar');
    
    if (profileName) profileName.textContent = currentUser.name || 'User';
    if (navAvatar && currentUser.picture) {
        navAvatar.src = currentUser.picture;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        font-family: var(--lato);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Reset form
function resetForm() {
    updateUIWithProfileData();
    showNotification('Changes discarded', 'info');
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

// Initialize dashboard functionality
function initializeDashboard() {
    // Sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('hide');
        });
    }

    // Section navigation
    const sideMenuLinks = document.querySelectorAll('.side-menu a[data-section]');
    const sections = document.querySelectorAll('.section');
    
    sideMenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            
            // Update active menu item
            sideMenuLinks.forEach(l => l.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Avatar upload handler
    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                uploadAvatar(file);
            }
        });
    }

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                fullName: document.getElementById('full-name').value,
                phone: document.getElementById('phone').value,
                company: document.getElementById('company').value,
                position: document.getElementById('position').value,
                bio: document.getElementById('bio').value
            };
            
            await saveProfileData(formData);
        });
    }

    // Initial profile form submission
    const initialProfileForm = document.getElementById('initial-profile-form');
    if (initialProfileForm) {
        initialProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                phone: document.getElementById('modal-phone').value,
                company: document.getElementById('modal-company').value,
                position: document.getElementById('modal-position').value,
                bio: document.getElementById('modal-bio').value
            };
            
            const success = await saveProfileData(formData);
            if (success) {
                document.getElementById('profile-modal').style.display = 'none';
                showNotification('Profile completed successfully!');
            }
        });
    }

    // Bio character counter
    const bioTextarea = document.getElementById('bio');
    if (bioTextarea) {
        bioTextarea.addEventListener('input', function() {
            const charCount = document.getElementById('bio-char-count');
            if (charCount) {
                charCount.textContent = this.value.length;
            }
        });
    }

    // Dark mode toggle
    const switchMode = document.getElementById('switch-mode');
    if (switchMode) {
        switchMode.addEventListener('change', function() {
            document.body.classList.toggle('dark', this.checked);
        });
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
window.resetForm = resetForm;
