// Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Current user reference
let currentUser = null;
let userProfileListener = null;

// Check authentication status
function checkAuthStatus() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            initializeUserProfile(user);
            displayUserInfo(user);
            setupProfileListener(user.uid);
        } else {
            window.location.href = '/login/index.html';
        }
    });
}

// Initialize user profile in Firestore
async function initializeUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        // Create new user profile
        await userRef.set({
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'User',
            picture: user.photoURL || 'img/people.png',
            phone: '',
            company: '',
            position: '',
            bio: '',
            plan: 'Starter',
            emailVerified: user.emailVerified,
            joined: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            profileViews: 0,
            activity: []
        });
        
        // Show profile completion modal for new users
        setTimeout(() => {
            document.getElementById('profile-modal').style.display = 'block';
        }, 1000);
    } else {
        // Update last login time
        await userRef.update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Set up real-time listener for profile changes
function setupProfileListener(userId) {
    if (userProfileListener) {
        userProfileListener(); // Remove previous listener
    }
    
    userProfileListener = db.collection('users').doc(userId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                loadProfileData(userData);
                
                // Increment profile views (simulated)
                if (Math.random() < 0.3) { // 30% chance to increment on each load
                    incrementProfileViews(userId);
                }
            }
        }, (error) => {
            console.error("Error listening to profile updates:", error);
            showNotification('Error loading profile data', 'error');
        });
}

// Load profile data from Firestore
function loadProfileData(userData) {
    // Update profile section
    document.getElementById('profile-name').textContent = userData.name || 'User';
    document.getElementById('profile-email').textContent = userData.email || 'No email';
    document.getElementById('full-name').value = userData.name || '';
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('company').value = userData.company || '';
    document.getElementById('position').value = userData.position || '';
    document.getElementById('bio').value = userData.bio || '';
    
    // Update avatar
    if (userData.picture) {
        document.getElementById('profile-avatar').src = userData.picture;
        // Also update navbar avatar
        const navbarImg = document.querySelector('.profile img');
        if (navbarImg) {
            navbarImg.src = userData.picture;
        }
    }
    
    // Update dates
    if (userData.joined) {
        const joinedDate = userData.joined.toDate ? userData.joined.toDate() : new Date(userData.joined);
        document.getElementById('joined-date').textContent = joinedDate.toLocaleDateString();
    }
    
    if (userData.lastLogin) {
        const lastLoginDate = userData.lastLogin.toDate ? userData.lastLogin.toDate() : new Date(userData.lastLogin);
        document.getElementById('last-login').textContent = lastLoginDate.toLocaleDateString();
    }
    
    if (userData.lastUpdated) {
        const lastUpdatedDate = userData.lastUpdated.toDate ? userData.lastUpdated.toDate() : new Date(userData.lastUpdated);
        document.getElementById('last-updated').textContent = lastUpdatedDate.toLocaleDateString();
    }
    
    // Update account info
    document.getElementById('account-plan').textContent = userData.plan || 'Starter';
    document.getElementById('email-verified').textContent = userData.emailVerified ? 'Yes' : 'No';
    document.getElementById('profile-views').textContent = userData.profileViews || 0;
    
    // Update activity log
    updateActivityLog(userData.activity || []);
}

// Update activity log
function updateActivityLog(activities) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    
    // Show latest 5 activities
    const recentActivities = activities.slice(-5).reverse();
    
    if (recentActivities.length === 0) {
        activityList.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    recentActivities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class='bx ${getActivityIcon(activity.type)}'></i>
            </div>
            <div class="activity-details">
                <p class="activity-text">${activity.text}</p>
                <span class="activity-time">${formatActivityTime(activity.timestamp)}</span>
            </div>
        `;
        activityList.appendChild(activityItem);
    });
}

// Get appropriate icon for activity type
function getActivityIcon(activityType) {
    const icons = {
        'profile_update': 'bxs-edit',
        'avatar_change': 'bxs-user',
        'login': 'bxs-log-in',
        'default': 'bxs-circle'
    };
    return icons[activityType] || icons.default;
}

// Format activity timestamp
function formatActivityTime(timestamp) {
    const now = new Date();
    const activityTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return activityTime.toLocaleDateString();
}

// Display user information in navbar
function displayUserInfo(user) {
    const profileName = document.querySelector('.profile-name');
    
    if (user.displayName && profileName) {
        profileName.textContent = user.displayName;
    } else if (user.email && profileName) {
        profileName.textContent = user.email.split('@')[0];
    }
    
    if (user.photoURL) {
        const img = document.querySelector('.profile img');
        img.src = user.photoURL;
        img.alt = user.displayName || 'User';
    }
}

// Save profile data to Firestore
async function saveProfileData(formData) {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        
        // Prepare update data
        const updateData = {
            name: formData.fullName,
            phone: formData.phone,
            company: formData.company,
            position: formData.position,
            bio: formData.bio,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add activity log
        const activityItem = {
            type: 'profile_update',
            text: 'Updated profile information',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await userRef.update({
            ...updateData,
            activity: firebase.firestore.FieldValue.arrayUnion(activityItem)
        });
        
        // Update user display name in Firebase Auth if changed
        if (formData.fullName !== currentUser.displayName) {
            await currentUser.updateProfile({
                displayName: formData.fullName
            });
            displayUserInfo(currentUser);
        }
        
        showNotification('Profile updated successfully!');
        return true;
    } catch (error) {
        console.error("Error updating profile:", error);
        showNotification('Error updating profile', 'error');
        return false;
    }
}

// Change avatar function with Firebase Storage integration
async function changeAvatar() {
    if (!currentUser) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('Image size should be less than 5MB', 'error');
            return;
        }
        
        // Show upload progress
        const progressContainer = document.querySelector('.avatar-upload-progress');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        progressContainer.style.display = 'block';
        progressText.textContent = 'Uploading...';
        
        try {
            // Upload to Firebase Storage
            const storageRef = storage.ref();
            const avatarRef = storageRef.child(`avatars/${currentUser.uid}/${file.name}`);
            const uploadTask = avatarRef.put(file);
            
            // Monitor upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `Uploading... ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error("Upload error:", error);
                    showNotification('Error uploading avatar', 'error');
                    progressContainer.style.display = 'none';
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Update user profile with new avatar URL
                    const userRef = db.collection('users').doc(currentUser.uid);
                    
                    // Add activity log
                    const activityItem = {
                        type: 'avatar_change',
                        text: 'Changed profile picture',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    await userRef.update({
                        picture: downloadURL,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        activity: firebase.firestore.FieldValue.arrayUnion(activityItem)
                    });
                    
                    // Update Firebase Auth profile
                    await currentUser.updateProfile({
                        photoURL: downloadURL
                    });
                    
                    // Update UI
                    document.getElementById('profile-avatar').src = downloadURL;
                    const navbarImg = document.querySelector('.profile img');
                    if (navbarImg) {
                        navbarImg.src = downloadURL;
                    }
                    
                    progressContainer.style.display = 'none';
                    showNotification('Avatar updated successfully!');
                }
            );
            
        } catch (error) {
            console.error("Error changing avatar:", error);
            showNotification('Error changing avatar', 'error');
            progressContainer.style.display = 'none';
        }
    };
    
    input.click();
}

// Increment profile views
async function incrementProfileViews(userId) {
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            profileViews: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error("Error incrementing profile views:", error);
    }
}

// Reset form to original values
async function resetForm() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            loadProfileData(userDoc.data());
        }
        showNotification('Changes discarded', 'info');
    } catch (error) {
        console.error("Error resetting form:", error);
        showNotification('Error resetting form', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
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
        z-index: 1000;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Section navigation
function setupSectionNavigation() {
    const sideMenuLinks = document.querySelectorAll('.side-menu a');
    const sections = document.querySelectorAll('.section');
    
    sideMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            
            if (targetId && targetId.startsWith('#')) {
                // Update active menu item
                sideMenuLinks.forEach(l => l.parentElement.classList.remove('active'));
                link.parentElement.classList.add('active');
                
                // Show target section
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            }
        });
    });
}

// Initialize dashboard
function initializeDashboard() {
    setupSectionNavigation();
    
    // Existing dashboard functionality
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');
    allSideMenu.forEach(item => {
        const li = item.parentElement;
        item.addEventListener('click', function () {
            allSideMenu.forEach(i => {
                i.parentElement.classList.remove('active');
            });
            li.classList.add('active');
        });
    });

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');
    menuBar.addEventListener('click', function () {
        sidebar.classList.toggle('hide');
    });

    // Search functionality
    const searchButton = document.querySelector('#content nav form .form-input button');
    const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
    const searchForm = document.querySelector('#content nav form');
    searchButton.addEventListener('click', function (e) {
        if(window.innerWidth < 576) {
            e.preventDefault();
            searchForm.classList.toggle('show');
            if(searchForm.classList.contains('show')) {
                searchButtonIcon.classList.replace('bx-search', 'bx-x');
            } else {
                searchButtonIcon.classList.replace('bx-x', 'bx-search');
            }
        }
    });

    // Dark mode
    const switchMode = document.getElementById('switch-mode');
    switchMode.addEventListener('change', function () {
        document.body.classList.toggle('dark', this.checked);
    });

    // Profile form submission
    document.getElementById('profile-form').addEventListener('submit', async function(e) {
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

    // Initial profile form submission
    document.getElementById('initial-profile-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = {
            phone: document.getElementById('modal-phone').value,
            company: document.getElementById('modal-company').value,
            position: document.getElementById('modal-position').value
        };
        
        if (await saveProfileData(formData)) {
            document.getElementById('profile-modal').style.display = 'none';
        }
    });

    // Logout functionality
    const logoutButton = document.querySelector('.side-menu .logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (userProfileListener) {
            userProfileListener(); // Remove the listener
        }
        auth.signOut().then(() => {
            window.location.href = 'https://quizontal.cc';
        }).catch((error) => {
            console.error("Logout error:", error);
            showNotification('Error during logout', 'error');
        });
    }
}

// Placeholder functions for other actions
function changePassword() {
    showNotification('Password change functionality coming soon', 'info');
}

function exportData() {
    showNotification('Data export functionality coming soon', 'info');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        showNotification('Account deletion functionality coming soon', 'info');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeDashboard();
});

// Make functions globally available
window.changeAvatar = changeAvatar;
window.resetForm = resetForm;
window.logout = logout;
window.changePassword = changePassword;
window.exportData = exportData;
window.deleteAccount = deleteAccount;
