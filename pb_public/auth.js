/**
 * Authentication System für Vergabedokument-Generator
 * Handles login, registration, and session management
 */

const pb = new PocketBase(window.location.origin);

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

function initializeAuth() {
    const currentPage = window.location.pathname;
    
    // Check if user is already authenticated
    if (pb.authStore.isValid) {
        // User is logged in
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            // Redirect to dashboard if on auth pages
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Add logout functionality if on main app
        if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
            addLogoutButton();
        }
    } else {
        // User is not logged in
        if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
            // Redirect to login if trying to access main app
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Setup form handlers
    setupFormHandlers();
}

function setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.hasAttribute('data-handler-set')) {
        loginForm.addEventListener('submit', handleLogin);
        loginForm.setAttribute('data-handler-set', 'true');
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !registerForm.hasAttribute('data-handler-set')) {
        registerForm.addEventListener('submit', handleRegister);
        registerForm.setAttribute('data-handler-set', 'true');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const submitBtn = document.getElementById('login-btn');
    
    // Prevent multiple submissions
    if (submitBtn.disabled) {
        return;
    }
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const errorDiv = document.getElementById('error-message');
    
    try {
        // Disable submit button immediately
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wird angemeldet...';
        
        // Clear previous errors
        hideError();
        
        // Attempt login
        await pb.collection('users').authWithPassword(email, password);
        
        console.log('✅ Login successful');
        showSuccess('Anmeldung erfolgreich! Sie werden weitergeleitet...');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMessage = 'Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.';
        
        if (error.status === 400) {
            errorMessage = 'Ungültige E-Mail-Adresse oder Passwort.';
        } else if (error.status === 0) {
            errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.';
        }
        
        showError(errorMessage);
        
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Anmelden';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');
    
    const submitBtn = document.getElementById('register-btn');
    
    try {
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wird registriert...';
        
        // Clear previous messages
        hideError();
        hideSuccess();
        
        // Validate password confirmation
        if (password !== passwordConfirm) {
            throw new Error('Passwörter stimmen nicht überein.');
        }
        
        // Create user account
        const userData = {
            username: username,
            email: email,
            password: password,
            passwordConfirm: passwordConfirm,
            emailVisibility: true
        };
        
        await pb.collection('users').create(userData);
        
        console.log('✅ Registration successful');
        showSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
        
        // Redirect to login after short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        let errorMessage = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        
        if (error.message === 'Passwörter stimmen nicht überein.') {
            errorMessage = error.message;
        } else if (error.data?.email) {
            errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
        } else if (error.data?.username) {
            errorMessage = 'Dieser Benutzername ist bereits vergeben.';
        } else if (error.data?.password) {
            errorMessage = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
        } else if (error.status === 0) {
            errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.';
        }
        
        showError(errorMessage);
        
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">→</span>Registrieren';
    }
}

function addLogoutButton() {
    // Check if logout button already exists
    if (document.getElementById('logout-btn')) {
        return;
    }
    
    // Find header controls or create them
    let headerControls = document.querySelector('.header-controls');
    if (!headerControls) {
        headerControls = document.createElement('div');
        headerControls.className = 'header-controls';
        
        const headerContent = document.querySelector('.header-content');
        if (headerContent) {
            headerContent.appendChild(headerControls);
        }
    }
    
    // Create logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.className = 'btn-secondary';
    logoutBtn.innerHTML = '<span class="btn-icon">⏻</span>Abmelden';
    logoutBtn.onclick = handleLogout;
    
    // Add user info
    const userInfo = document.createElement('span');
    userInfo.className = 'user-info';
    userInfo.textContent = pb.authStore.model?.email || 'Angemeldet';
    
    headerControls.appendChild(userInfo);
    headerControls.appendChild(logoutBtn);
}

function handleLogout() {
    pb.authStore.clear();
    console.log('✅ Logout successful');
    window.location.href = 'login.html';
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function hideSuccess() {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

// Export for use in other scripts
window.authUtils = {
    isAuthenticated: () => pb.authStore.isValid,
    getCurrentUser: () => pb.authStore.model,
    logout: handleLogout,
    requireAuth: () => {
        if (!pb.authStore.isValid) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};