// Check authentication status
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !userData) {
        // Redirect to login page if not authenticated
        window.location.href = 'login/index.html';
        return;
    }
    
    // Display user info if available
    displayUserInfo();
}

// Display user information
function displayUserInfo() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const profileElement = document.querySelector('.profile');
    
    if (profileElement && userData.name) {
        const img = profileElement.querySelector('img');
        const nameElement = document.createElement('span');
        nameElement.className = 'profile-name';
        nameElement.textContent = userData.name;
        nameElement.style.marginLeft = '10px';
        nameElement.style.color = 'var(--dark)';
        
        // Add user name next to profile image
        if (!profileElement.querySelector('.profile-name')) {
            profileElement.appendChild(nameElement);
        }
        
        // Update profile image if available
        if (userData.picture) {
            img.src = userData.picture;
            img.alt = userData.name;
        }
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all authentication data
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('quizontalUsers');
        
        // Redirect to homepage
        window.location.href = 'https://quizontal.cc';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    checkAuthStatus();
    
    // Existing dashboard functionality
    initializeDashboard();
});

// Existing dashboard functionality
function initializeDashboard() {
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

    allSideMenu.forEach(item=> {
        const li = item.parentElement;

        item.addEventListener('click', function () {
            allSideMenu.forEach(i=> {
                i.parentElement.classList.remove('active');
            })
            li.classList.add('active');
        })
    });

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');

    menuBar.addEventListener('click', function () {
        sidebar.classList.toggle('hide');
    })

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
    })

    if(window.innerWidth < 768) {
        sidebar.classList.add('hide');
    } else if(window.innerWidth > 576) {
        searchButtonIcon.classList.replace('bx-x', 'bx-search');
        searchForm.classList.remove('show');
    }

    window.addEventListener('resize', function () {
        if(this.innerWidth > 576) {
            searchButtonIcon.classList.replace('bx-x', 'bx-search');
            searchForm.classList.remove('show');
        }
    })

    const switchMode = document.getElementById('switch-mode');
    switchMode.addEventListener('change', function () {
        if(this.checked) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    });
    
    // Add logout functionality to logout button
    const logoutButton = document.querySelector('.side-menu .logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Make logout function available globally
window.logout = logout;
