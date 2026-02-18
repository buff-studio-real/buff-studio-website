// Supabase Configuration
const SUPABASE_URL = 'https://rxalirtnxbspphoiriux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4YWxpcnRueGJzcHBob2lyaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDE1ODMsImV4cCI6MjA3NzY3NzU4M30.cepc0jFeVYDwU1k0-qt66Sdig7iVUdqTkvtbGu6jrHY';

// Supabase Client initialisieren
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login Status Management
let currentUser = null;

// Beim Laden der Seite prüfen ob User angemeldet ist
async function initializeAuth() {
    await checkLoginStatus();
    updateNavigation();
}

async function checkLoginStatus() {
    // Prüfe Session Storage und Local Storage
    const sessionUser = sessionStorage.getItem('current_user');
    const rememberedUser = localStorage.getItem('remembered_user');
    
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        console.log('User aus Session:', currentUser.username);
    } else if (rememberedUser) {
        currentUser = JSON.parse(rememberedUser);
        console.log('User aus Remember Me:', currentUser.username);
        // Zurück in Session speichern
        sessionStorage.setItem('current_user', JSON.stringify(currentUser));
    } else {
        console.log('Kein User angemeldet');
        currentUser = null;
    }
}

function updateNavigation() {
    console.log('Update Navigation aufgerufen, currentUser:', currentUser);
    
    // Finde das Navigationselement
    let authNavItem = document.querySelector('.login-nav-item') || document.querySelector('.user-nav-item');
    
    if (!authNavItem) {
        console.log('Kein Navigationselement gefunden');
        return;
    }
    
    if (currentUser) {
        // Wenn User angemeldet ist, zeige Username an
        console.log('Zeige Username an:', currentUser.username);
        
        // Cart Count berechnen
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartBadge = cartCount > 0 ? `<span class="cart-count">${cartCount}</span>` : '';
        
        // Admin Badge für Exotischer, Lars und MAX_YT
        const isAdmin = currentUser.username === 'Exotischer' || currentUser.username === 'Lars' || currentUser.username === 'MAX_YT';
        const adminBadge = isAdmin ? ' 👑' : '';
        
        authNavItem.innerHTML = `
            <a href="profile.html" class="user-nav-link">
                <span class="user-avatar">${getInitials(currentUser.username)}</span>
                ${currentUser.username}${adminBadge} ${cartBadge}
            </a>
        `;
        authNavItem.className = 'user-nav-item';
    } else {
        // Wenn kein User angemeldet ist, zeige Login an
        console.log('Zeige Login an');
        authNavItem.innerHTML = `
            <a href="login.html" class="login-nav-link">➜]</a>
        `;
        authNavItem.className = 'login-nav-item';
    }
}

function getInitials(username) {
    return username ? username.charAt(0).toUpperCase() : 'U';
}

// Login-Funktion
function loginUser(user) {
    currentUser = user;
    sessionStorage.setItem('current_user', JSON.stringify(user));
    console.log('User eingeloggt:', user.username);
    updateNavigation();
}

// Logout-Funktion
function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem('current_user');
    localStorage.removeItem('remembered_user');
    console.log('User ausgeloggt');
    updateNavigation();
    window.location.href = 'index.html';
}

// Prüfe ob User eingeloggt ist für geschützte Seiten
function requireAuth() {
    if (!currentUser) {
        showMessage('Bitte melde dich erst an!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

// Hilfsfunktion für Nachrichten
function showMessage(message, type) {
    // Einfache Nachrichtenanzeige
    alert(message);
}

// Hilfe Modal Funktionen
function openHelp() {
    document.getElementById('helpModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Schließen beim Klick außerhalb
document.addEventListener('click', function(e) {
    const modal = document.getElementById('helpModal');
    if (e.target === modal) {
        closeHelp();
    }
});

// Schließen mit Escape-Taste
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const helpModal = document.getElementById('helpModal');
        if (helpModal && helpModal.style.display === 'block') {
            closeHelp();
        }
    }
});

// Automatisch beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

// Cart Count Funktion
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Cart Count in der Navigation aktualisieren
    const cartCountElement = document.querySelector('.cart-count');
    const userNavLink = document.querySelector('.user-nav-link');
    
    if (userNavLink) {
        let existingCartCount = userNavLink.querySelector('.cart-count');
        
        if (totalItems > 0) {
            if (existingCartCount) {
                existingCartCount.textContent = totalItems;
            } else {
                userNavLink.innerHTML += `<span class="cart-count">${totalItems}</span>`;
            }
        } else if (existingCartCount) {
            existingCartCount.remove();
        }
    }
}

// Benutzer-Datenbank Funktionen (für Fallback)
function initializeUserDatabase() {
    if (!localStorage.getItem('buffstudio_users')) {
        localStorage.setItem('buffstudio_users', JSON.stringify([]));
    }
}

function getUsers() {
    return JSON.parse(localStorage.getItem('buffstudio_users') || '[]');
}

// In script.js (für alle Seiten) einfügen:
// Diese Funktion sollte in der script.js für alle Seiten verfügbar sein
function getCurrentUser() {
    const sessionUser = sessionStorage.getItem('current_user');
    const rememberedUser = localStorage.getItem('remembered_user');
    
    if (sessionUser) {
        return JSON.parse(sessionUser);
    } else if (rememberedUser) {
        return JSON.parse(rememberedUser);
    }
    return null;
}