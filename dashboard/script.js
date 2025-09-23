// Check authentication status
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !userData) {
        window.location.href = '/login/index.html';
        return;
    }
    
    displayUserInfo();
    loadProfileData();
    checkProfileCompletion();
}

// Display user information in navbar
function displayUserInfo() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const profileElement = document.querySelector('.profile');
    const profileName = document.querySelector('.profile-name');
    
    if (userData.name && profileName) {
        profileName.textContent = userData.name;
    }
    
    if (userData.picture) {
        const img = profileElement.querySelector('img');
        img.src = userData.picture;
        img.alt = userData.name;
    }
}

// Load profile data
function loadProfileData() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
    
    // Merge user data with profile data
    const mergedData = { ...userData, ...profileData };
    
    // Update profile section
    document.getElementById('profile-name').textContent = mergedData.name || 'User';
    document.getElementById('profile-email').textContent = mergedData.email || 'No email';
    document.getElementById('full-name').value = mergedData.name || '';
    document.getElementById('phone').value = mergedData.phone || '';
    document.getElementById('company').value = mergedData.company || '';
    document.getElementById('position').value = mergedData.position || '';
    document.getElementById('bio').value = mergedData.bio || '';
    
    // Update avatar
    if (mergedData.picture) {
        document.getElementById('profile-avatar').src = mergedData.picture;
    }
    
    // Update dates
    if (mergedData.joined) {
        document.getElementById('joined-date').textContent = new Date(mergedData.joined).toLocaleDateString();
    }
    document.getElementById('last-login').textContent = new Date().toLocaleDateString();
    
    // Update account info
    document.getElementById('account-plan').textContent = mergedData.plan || 'Starter';
    document.getElementById('email-verified').textContent = mergedData.email_verified ? 'Yes' : 'No';
}

// Check if profile needs completion
function checkProfileCompletion() {
    const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
    
    if (!profileData.phone || !profileData.company) {
        setTimeout(() => {
            document.getElementById('profile-modal').style.display = 'block';
        }, 1000);
    }
}

// Save profile data
function saveProfileData(formData) {
    const currentData = JSON.parse(localStorage.getItem('profileData') || '{}');
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const updatedData = {
        ...currentData,
        ...formData,
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('profileData', JSON.stringify(updatedData));
    
    // Also update user data if name changed
    if (formData.fullName && formData.fullName !== userData.name) {
        userData.name = formData.fullName;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        displayUserInfo();
    }
    
    loadProfileData();
    return updatedData;
}

// Change avatar function
function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
                profileData.avatar = event.target.result;
                localStorage.setItem('profileData', JSON.stringify(profileData));
                document.getElementById('profile-avatar').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
}

// Reset form to original values
function resetForm() {
    loadProfileData();
    showNotification('Changes discarded', 'info');
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
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
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            fullName: document.getElementById('full-name').value,
            phone: document.getElementById('phone').value,
            company: document.getElementById('company').value,
            position: document.getElementById('position').value,
            bio: document.getElementById('bio').value
        };
        
        saveProfileData(formData);
        showNotification('Profile updated successfully!');
    });

    // Initial profile form submission
    document.getElementById('initial-profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            phone: document.getElementById('modal-phone').value,
            company: document.getElementById('modal-company').value,
            position: document.getElementById('modal-position').value
        };
        
        saveProfileData(formData);
        document.getElementById('profile-modal').style.display = 'none';
        showNotification('Profile completed successfully!');
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
window.changeAvatar = changeAvatar;
window.resetForm = resetForm;
window.logout = logout;

// Logo Section
function selectLogo(style) {
    document.getElementById('logo-form').style.display = 'block';
    document.getElementById('logo-style').value = style;
}

// Handle Form Submission
document.getElementById('create-logo-form').addEventListener('submit', function(e){
    e.preventDefault();
    
    const logoText = document.getElementById('logo-text').value;
    const logoColor = document.getElementById('logo-color').value;
    const logoStyle = document.getElementById('logo-style').value;

    // Format WhatsApp message
    const phoneNumber = "+94774915917"; // Add your number
    const message = `New Logo Order:%0AStyle: ${logoStyle}%0AText: ${logoText}%0AColor: ${logoColor}`;
    
    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');

    // Show order confirmation message
    document.getElementById('order-msg').style.display = 'block';
    document.getElementById('order-msg').innerText = 'Your order will be processed. Contact me via WhatsApp to finalize it.';

    // Optionally reset form
    this.reset();
    document.getElementById('logo-form').style.display = 'none';
});

