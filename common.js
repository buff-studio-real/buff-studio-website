// common.js - Gemeinsame Funktionen für alle Seiten

// Supabase Configuration
const SUPABASE_URL = 'https://rxalirtnxbspphoiriux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4YWxpcnRueGJzcHBob2lyaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDE1ODMsImV4cCI6MjA3NzY3NzU4M30.cepc0jFeVYDwU1k0-qt66Sdig7iVUdqTkvtbGu6jrHY';

// Supabase Client initialisieren (nur wenn nicht vorhanden)
function initializeSupabaseClient() {
    // Prüfe ob bereits ein gültiger Supabase Client existiert
    if (window.supabase && typeof window.supabase === 'object' && window.supabase.from) {
        console.log('✅ Verwende vorhandenen Supabase Client');
        return window.supabase;
    }
    
    // Prüfe ob Supabase global verfügbar ist
    if (typeof supabase !== 'undefined' && supabase !== null && typeof supabase.createClient === 'function') {
        try {
            console.log('🔄 Erstelle neuen Supabase Client in common.js');
            window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase Client erfolgreich in common.js initialisiert');
            return window.supabase;
        } catch (error) {
            console.error('❌ Fehler bei Supabase Initialisierung in common.js:', error);
            return null;
        }
    } else {
        console.log('ℹ️ Supabase ist nicht global verfügbar oder wurde noch nicht geladen');
        return null;
    }
}

// Euro Formatierung
function formatEuro(amount) {
    return '€' + parseFloat(amount).toFixed(2).replace('.', ',');
}

// ================================
// ALTER LOGIN SYSTEM (aus dem ersten Code)
// ================================

// Aktuelle Benutzer-Funktion (aus localStorage/sessionStorage)
function getCurrentUser() {
    // Prüfe sessionStorage zuerst
    const sessionUser = sessionStorage.getItem('current_user');
    if (sessionUser) {
        try {
            return JSON.parse(sessionUser);
        } catch (e) {
            console.error('Fehler beim Parsen des sessionStorage Users:', e);
        }
    }
    
    // Dann localStorage (remember me)
    const rememberedUser = localStorage.getItem('remembered_user');
    if (rememberedUser) {
        try {
            return JSON.parse(rememberedUser);
        } catch (e) {
            console.error('Fehler beim Parsen des localStorage Users:', e);
        }
    }
    
    return null;
}

// Login-Funktion (verwendet Supabase)
async function loginUser(username, password, rememberMe = false) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase nicht verfügbar');
        }

        // In der users-Tabelle nach Benutzer suchen
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password) // ACHTUNG: Passwörter sollten gehasht sein!
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new Error('Benutzer nicht gefunden');
            }
            throw error;
        }

        if (!users) {
            throw new Error('Ungültiger Benutzername oder Passwort');
        }

        // User-Objekt erstellen
        const user = {
            username: users.username,
            email: users.email,
            balance: parseFloat(users.balance || 0),
            created_at: users.created_at,
            last_login: new Date().toISOString()
        };

        // User in Storage speichern
        sessionStorage.setItem('current_user', JSON.stringify(user));
        
        if (rememberMe) {
            localStorage.setItem('remembered_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('remembered_user');
        }

        // Last Login aktualisieren
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('username', username);

        console.log('✅ Login erfolgreich:', username);
        return { success: true, user: user };

    } catch (error) {
        console.error('❌ Login fehlgeschlagen:', error.message);
        return { 
            success: false, 
            error: error.message || 'Login fehlgeschlagen' 
        };
    }
}

// Registrierungs-Funktion
async function registerUser(username, email, password) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase nicht verfügbar');
        }

        // Prüfen ob Benutzername bereits existiert
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingUser) {
            throw new Error('Benutzername bereits vergeben');
        }

        // Prüfen ob Email bereits existiert
        const { data: existingEmail, error: emailError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (emailError && emailError.code !== 'PGRST116') {
            throw emailError;
        }

        if (existingEmail) {
            throw new Error('Email bereits registriert');
        }

        // Neuen Benutzer erstellen
        const newUser = {
            username: username,
            email: email,
            password: password, // ACHTUNG: In Produktion sollte das Passwort gehasht werden!
            balance: 0.00,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert([newUser]);

        if (error) {
            throw error;
        }

        console.log('✅ Registrierung erfolgreich:', username);
        
        // Automatisch einloggen
        const loginResult = await loginUser(username, password);
        if (loginResult.success) {
            return { 
                success: true, 
                message: 'Registrierung erfolgreich! Du wirst automatisch eingeloggt.',
                user: loginResult.user
            };
        } else {
            return { 
                success: true, 
                message: 'Registrierung erfolgreich! Bitte melde dich jetzt an.',
                needsLogin: true
            };
        }

    } catch (error) {
        console.error('❌ Registrierung fehlgeschlagen:', error.message);
        return { 
            success: false, 
            error: error.message || 'Registrierung fehlgeschlagen' 
        };
    }
}

// Logout-Funktion
function logoutUser() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
        sessionStorage.removeItem('current_user');
        localStorage.removeItem('remembered_user');
        window.location.href = 'index.html';
    }
}

// Prüfen ob Benutzer Admin ist
function checkIfUserIsAdminSync(username) {
    const adminUsers = ['Ungewoehnlicher', 'Lars', 'MAX_YT'];
    return adminUsers.includes(username);
}

// ================================
// NAVBAR FUNKTIONEN
// ================================

// CSS für Dropdown hinzufügen
function addDropdownStyles() {
    if (document.getElementById('dropdown-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dropdown-styles';
    style.textContent = `
        .login-nav-item {
            position: relative;
            margin-left: 10px;
        }
        
        .user-wrapper {
            position: relative;
            display: inline-block;
        }
        
        .user-avatar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            transition: all 0.3s ease;
            cursor: pointer;
            min-width: fit-content;
            white-space: nowrap;
        }
        
        .user-avatar:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .username {
            color: #4CAF50;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.5px;
        }
        
        .dropdown-arrow {
            font-size: 10px;
            color: #aaa;
            transition: transform 0.3s ease;
            margin-left: 2px;
        }
        
        .user-wrapper:hover .dropdown-arrow {
            transform: rotate(180deg);
            color: #4CAF50;
        }
        
        .user-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: rgba(30, 30, 30, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 8px 0;
            min-width: 200px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 8px;
        }
        
        .user-wrapper:hover .user-dropdown {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        
        .user-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
            font-size: 14px;
            font-weight: 500;
        }
        
        .user-dropdown-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-left-color: #667eea;
            padding-left: 25px;
        }
        
        .user-dropdown-item.profile {
            color: #4CAF50;
        }
        
        .user-dropdown-item.profile:hover {
            background: rgba(76, 175, 80, 0.1);
        }
        
        .user-dropdown-item.admin {
            color: #FFD700;
        }
        
        .user-dropdown-item.admin:hover {
            background: rgba(255, 215, 0, 0.1);
        }
        
        .user-dropdown-item.logout {
            color: #ff4757;
        }
        
        .user-dropdown-item.logout:hover {
            background: rgba(255, 71, 87, 0.1);
        }
        
        .user-dropdown-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            margin: 6px 20px;
        }
        
        /* Für nicht-eingeloggte Benutzer */
        .guest-links {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .guest-links a {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.3s ease;
            border: 1px solid transparent;
        }
        
        .guest-links a:first-child {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            border-color: rgba(102, 126, 234, 0.3);
        }
        
        .guest-links a:first-child:hover {
            background: rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        
        .guest-links a:last-child {
            background: rgba(76, 175, 80, 0.1);
            color: #4CAF50;
            border-color: rgba(76, 175, 80, 0.3);
        }
        
        .guest-links a:last-child:hover {
            background: rgba(76, 175, 80, 0.2);
            transform: translateY(-2px);
        }
        
        /* Balance Styling */
        .balance-nav-item a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 20px;
            color: #FFD700;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .balance-nav-item a:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: translateY(-2px);
        }
        
        /* Admin Link Styling */
        #adminNavItem a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 20px;
            color: #FFD700;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        #adminNavItem a:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: translateY(-2px);
        }
        
        /* Live Event Styling */
        #liveEventNavItem a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 71, 87, 0.1);
            border: 1px solid rgba(255, 71, 87, 0.3);
            border-radius: 20px;
            color: #ff4757;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        }
        
        #liveEventNavItem a:hover {
            background: rgba(255, 71, 87, 0.2);
            transform: translateY(-2px);
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        /* Friends & Chat Link in Navbar */
        .friends-nav-item a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            color: #667eea;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .friends-nav-item a:hover {
            background: rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
}

// Navbar aktualisieren
function updateNavbar() {
    const loginNavItem = document.querySelector('.login-nav-item');
    const balanceNavItem = document.querySelector('.balance-nav-item');
    const adminNavItem = document.getElementById('adminNavItem');
    const friendsNavItem = document.getElementById('friendsNavItem');
    const liveEventNavItem = document.getElementById('liveEventNavItem');
    
    if (!loginNavItem) {
        console.log('❌ Login Nav Item nicht gefunden');
        return;
    }
    
    // User aus Storage holen (ALTER LOGIN SYSTEM)
    const currentUser = getCurrentUser();
    
    if (currentUser) {
        // Eingeloggt - Mit Dropdown
        console.log('✅ User eingeloggt (alte Methode):', currentUser.username);
        
        // Prüfen ob Admin (harte Liste)
        const isAdmin = checkIfUserIsAdminSync(currentUser.username);
        
        // Erstelle Dropdown HTML
        let dropdownHTML = `
            <div class="user-wrapper">
                <div class="user-avatar">
                    <span>👤</span>
                    <span class="username">${escapeHtml(currentUser.username)}</span>
                    <span class="dropdown-arrow">▼</span>
                </div>
                <div class="user-dropdown">
                    <a href="profile.html" class="user-dropdown-item profile">
                        <span>👤</span>
                        <span>Profil</span>
                    </a>
                    <a href="friendsandchat.html" class="user-dropdown-item">
                        <span>👥</span>
                        <span>Freunde & Chat</span>
                    </a>
        `;
        
        // Admin Link nur für Admins
        if (isAdmin) {
            dropdownHTML += `
                <a href="shopadmin.html" class="user-dropdown-item admin">
                    <span>⚙️</span>
                    <span>Admin Bereich</span>
                </a>
            `;
        }
        
        dropdownHTML += `
                    <div class="user-dropdown-divider"></div>
                    <a href="javascript:void(0)" onclick="CommonJS.logoutUser()" class="user-dropdown-item logout">
                        <span>🚪</span>
                        <span>Ausloggen</span>
                    </a>
                </div>
            </div>
        `;
        
        loginNavItem.innerHTML = dropdownHTML;
        
        // Balance anzeigen
        if (balanceNavItem) {
            balanceNavItem.style.display = 'block';
            const balanceElement = document.getElementById('navBalance');
            if (balanceElement) {
                // Guthaben aus dem User-Objekt nehmen
                const balance = currentUser.balance || 0;
                balanceElement.textContent = formatEuro(balance);
            }
        }
        
        // Admin-Bereich in der Haupt-Navbar anzeigen
        if (adminNavItem && isAdmin) {
            adminNavItem.style.display = 'block';
            console.log('👑 Admin-Bereich angezeigt für:', currentUser.username);
        } else if (adminNavItem) {
            adminNavItem.style.display = 'none';
        }
        
        // Friends & Chat Navbar Item anzeigen
        if (friendsNavItem) {
            friendsNavItem.style.display = 'block';
        }
        
    } else {
        // Nicht eingeloggt
        console.log('❌ Kein User eingeloggt (alte Methode)');
        loginNavItem.innerHTML = `
            <div class="guest-links">
                <a href="login.html">🔐 Login</a>
            </div>
        `;
        if (balanceNavItem) balanceNavItem.style.display = 'none';
        if (adminNavItem) adminNavItem.style.display = 'none';
        if (friendsNavItem) friendsNavItem.style.display = 'none';
        if (liveEventNavItem) liveEventNavItem.style.display = 'none';
    }
}

// Navbar initialisieren
function initializeNavbar() {
    console.log('🚀 Initialisiere Navbar (alte Methode)...');
    updateNavbar();
    checkLiveEventStatus();
    addDropdownStyles();
}

// ================================
// SUPABASE HELPER FUNCTIONS
// ================================

// Gibt den Supabase Client zurück (initialisiert ihn wenn nötig)
function getSupabaseClient() {
    // Versuche zuerst den globalen Client zu verwenden
    if (window.supabase && typeof window.supabase === 'object' && window.supabase.from) {
        return window.supabase;
    }
    
    // Ansonsten versuche zu initialisieren
    return initializeSupabaseClient();
}

// Guthaben aus users Tabelle laden (für dynamische Updates)
async function loadUserBalance(username) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.log('ℹ️ Kein Supabase Client für Balance-Check');
            return 0;
        }

        const { data: userData, error } = await supabase
            .from('users')
            .select('balance')
            .eq('username', username)
            .single();
        
        if (error) {
            console.error('Fehler beim Laden des Guthabens:', error);
            return 0;
        }
        
        return parseFloat(userData?.balance || 0);
    } catch (error) {
        console.error('Fehler:', error);
        return 0;
    }
}

// Balance in der Navbar aktualisieren (laden von DB)
async function updateNavbarBalance() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const balanceNavItem = document.querySelector('.balance-nav-item');
    if (!balanceNavItem || balanceNavItem.style.display === 'none') return;
    
    const balanceElement = document.getElementById('navBalance');
    if (!balanceElement) return;
    
    try {
        const balance = await loadUserBalance(currentUser.username);
        balanceElement.textContent = formatEuro(balance);
        
        // Update auch den User im Storage mit neuer Balance
        const user = getCurrentUser();
        user.balance = balance;
        sessionStorage.setItem('current_user', JSON.stringify(user));
        
        const rememberedUser = localStorage.getItem('remembered_user');
        if (rememberedUser) {
            const remembered = JSON.parse(rememberedUser);
            remembered.balance = balance;
            localStorage.setItem('remembered_user', JSON.stringify(remembered));
        }
        
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Balance:', error);
    }
}

// Live Event Status prüfen
async function checkLiveEventStatus() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.log('ℹ️ Kein Supabase Client für Event-Check');
            return;
        }

        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gt('end_time', new Date().toISOString())
            .single();
        
        const liveEventNavItem = document.getElementById('liveEventNavItem');
        if (liveEventNavItem) {
            if (events) {
                liveEventNavItem.style.display = 'block';
                // Link zur Live Event Seite setzen
                const link = liveEventNavItem.querySelector('a');
                if (link) {
                    link.href = 'live-event.html';
                    link.title = `${events.title}\n${events.description || ''}\nEndet: ${new Date(events.end_time).toLocaleString('de-DE')}`;
                }
                console.log('🎪 Live Event angezeigt:', events.title);
            } else {
                liveEventNavItem.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('ℹ️ Kein aktives Event gefunden oder Supabase nicht verfügbar');
    }
}

// Live Event Funktionen
async function checkLiveEvent() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.log('ℹ️ Kein Supabase Client für Event-Check');
            return null;
        }

        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gt('end_time', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Fehler beim Laden der Events:', error);
            return null;
        }
        
        if (events && events.length > 0) {
            return events[0];
        }
        return null;
        
    } catch (error) {
        console.error('Fehler:', error);
        return null;
    }
}

// Live Event Navbar aktualisieren
async function updateLiveEventNavbar() {
    try {
        const liveEvent = await checkLiveEvent();
        const liveEventNavItem = document.getElementById('liveEventNavItem');
        
        if (liveEventNavItem) {
            if (liveEvent) {
                liveEventNavItem.style.display = 'block';
                // Link zur Live Event Seite setzen
                const link = liveEventNavItem.querySelector('a');
                if (link) {
                    link.href = 'live-event.html';
                    link.title = `${liveEvent.title}\n${liveEvent.description || ''}\nEndet: ${new Date(liveEvent.end_time).toLocaleString('de-DE')}`;
                }
            } else {
                liveEventNavItem.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Live Event Navbar:', error);
    }
}

// Alle 30 Sekunden auf aktive Events prüfen
function startLiveEventChecker() {
    updateLiveEventNavbar();
    setInterval(updateLiveEventNavbar, 30000);
}

// ================================
// FREUNDE FUNKTIONEN
// ================================

// Initialisierungs-Funktion für Seiten, die Freunde-Funktionen benötigen
function initializeFriendsPage() {
    console.log('📱 Initialisiere Freunde-Seite (alte Methode)');
    
    // Überprüfe ob User eingeloggt ist
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.log('❌ Kein User für Freunde-Seite');
        return false;
    }
    
    // Sicherstellen, dass Supabase verfügbar ist
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase Client nicht verfügbar für Freunde-Seite');
        return false;
    }
    
    return true;
}

// ================================
// HILFSFUNKTIONEN
// ================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sicherstellen, dass Supabase geladen ist
function ensureSupabaseLoaded() {
    return new Promise((resolve, reject) => {
        if (getSupabaseClient()) {
            console.log('✅ Supabase Client bereits verfügbar');
            resolve(getSupabaseClient());
            return;
        }
        
        console.log('⏳ Warte auf Supabase...');
        
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            const client = getSupabaseClient();
            if (client) {
                clearInterval(checkInterval);
                console.log('✅ Supabase erfolgreich geladen nach', attempts, 'Versuchen');
                resolve(client);
                return;
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn('⚠️ Supabase konnte nicht geladen werden');
                reject(new Error('Supabase konnte nicht geladen werden'));
            }
        }, 500);
    });
}

// ================================
// INITIALISIERUNG
// ================================

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM geladen - initialisiere Common Features (alte Methode)');
    
    // Versuche Supabase zu initialisieren
    const supabaseClient = initializeSupabaseClient();
    
    if (supabaseClient) {
        console.log('✅ Supabase Client verfügbar für Common Features');
    } else {
        console.log('ℹ️ Supabase Client nicht verfügbar, fahre mit lokalen Features fort');
    }
    
    // Navbar immer initialisieren (funktioniert auch ohne Supabase)
    initializeNavbar();
    startLiveEventChecker();
    
    // Balance alle 60 Sekunden aktualisieren
    setInterval(updateNavbarBalance, 60000);
    
    // Initiale Balance laden
    setTimeout(updateNavbarBalance, 1000);
});

// Globale Hilfsfunktionen für andere Seiten
if (!window.getInitials) {
    window.getInitials = function(username) {
        return username ? username.charAt(0).toUpperCase() : 'U';
    };
}

if (!window.escapeHtml) {
    window.escapeHtml = escapeHtml;
}

console.log('✅ Common.js geladen und initialisiert (alte Login Methode)');

// Exportiere wichtige Funktionen für andere Skripte
if (typeof module === 'undefined') {
    window.CommonJS = {
        // Login System
        getCurrentUser,
        loginUser,
        registerUser,
        logoutUser,
        checkIfUserIsAdminSync,
        
        // Formatierung
        formatEuro,
        
        // Navbar
        initializeNavbar,
        updateNavbar,
        updateNavbarBalance,
        
        // Freunde
        initializeFriendsPage,
        
        // Supabase
        getSupabaseClient,
        ensureSupabaseLoaded,
        
        // Events
        checkLiveEvent,
        updateLiveEventNavbar
    };
}