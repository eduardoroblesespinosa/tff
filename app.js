document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    const adminLoginScreen = document.getElementById('admin-login-screen');
    const adminDashboard = document.getElementById('admin-dashboard');

    const loginButtons = document.querySelectorAll('.btn-login');
    const logoutButton = document.getElementById('logout-btn');
    const adminLogoutButton = document.getElementById('admin-logout-btn');

    const userNameEl = document.getElementById('user-name');
    const balanceEl = document.getElementById('token-balance');
    const earnButtons = document.querySelectorAll('.earn-card .btn:not(#spotify-connect-btn)');
    const redeemButtons = document.querySelectorAll('.reward-card .btn');
    const shareBtn = document.getElementById('share-btn');
    const followBtn = document.getElementById('follow-btn');
    const photoRewardStatusEl = document.getElementById('photo-reward-status');

    // Gallery elements
    const gallerySection = document.getElementById('gallery-section');
    const photoGallery = document.getElementById('photo-gallery');

    // Modal elements
    const shareModal = document.getElementById('share-modal');
    const photoModal = document.getElementById('photo-modal');
    const shoutoutModal = document.getElementById('shoutout-modal');
    const merchModal = document.getElementById('merch-modal');
    const closeModalBtns = document.querySelectorAll('.modal .close-btn');
    const unlockedPhotoEl = document.getElementById('unlocked-photo');
    const downloadPhotoBtn = document.getElementById('download-photo-btn');
    const twitterShareLink = document.getElementById('twitter-share-link');
    const facebookShareLink = document.getElementById('facebook-share-link');
    const whatsappShareLink = document.getElementById('whatsapp-share-link');

    // Name Modal
    const nameModal = document.getElementById('name-modal');
    const nameForm = document.getElementById('name-form');
    const fanNameInput = document.getElementById('fan-name');

    // New Modal interactive elements
    const shoutoutForm = document.getElementById('shoutout-form');
    const shoutoutNameInput = document.getElementById('shoutout-name');
    const merchCodeEl = document.getElementById('merch-code');
    const copyCodeBtn = document.getElementById('copy-code-btn');

    // Admin Edit/Delete Modals
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const editUserIdInput = document.getElementById('edit-user-id');
    const editFanNameInput = document.getElementById('edit-fan-name');
    const editTffBalanceInput = document.getElementById('edit-tff-balance');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Spotify UI Elements
    const spotifyConnectBtn = document.getElementById('spotify-connect-btn');
    const spotifyDisconnectedView = document.getElementById('spotify-disconnected');
    const spotifyConnectedView = document.getElementById('spotify-connected');
    const spotifyPlayerInfo = document.getElementById('spotify-player-info');
    const spotifyCurrentTrack = document.getElementById('spotify-current-track');
    const spotifyTrackName = document.getElementById('spotify-track-name');
    const spotifyArtistName = document.getElementById('spotify-artist-name');


    // Admin Elements
    const adminLoginLink = document.getElementById('admin-login-link');
    const backToUserLoginLink = document.getElementById('back-to-user-login');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginError = document.getElementById('admin-login-error');
    const userListTbody = document.getElementById('user-list-tbody');


    // State
    let currentUser = null;
    let userData = {};
    let pendingProvider = null;
    let spotifyAccessToken = null;
    let spotifyPollingInterval = null;

    const TOTAL_EXCLUSIVE_PHOTOS = 20;
    const exclusivePhotos = Array.from({ length: TOTAL_EXCLUSIVE_PHOTOS }, (_, i) => `asset_exclusive_photo_${(i + 1).toString().padStart(2, '0')}.png`);

    // Spotify API Configuration
    // IMPORTANT: Replace with your own Spotify Client ID.
    // Go to https://developer.spotify.com/dashboard/ to create an app.
    const SPOTIFY_CLIENT_ID = 'df7bed6b88204b7195bb86f24400645b'; 
    const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;
    const SPOTIFY_SCOPES = 'user-read-playback-state user-read-currently-playing';

    // --- NAVIGATION ---
    const showScreen = (screenToShow) => {
        [loginScreen, dashboard, adminLoginScreen, adminDashboard].forEach(screen => {
            screen.classList.add('hidden');
        });
        screenToShow.classList.remove('hidden');
    };

    // --- AUTHENTICATION (SIMULATED) ---
    const checkLoginState = () => {
        // Check for spotify auth callback
        getSpotifyTokenFromURL();

        // Revisa si hay un usuario guardado en localStorage para mantener la sesión activa.
        if (sessionStorage.getItem('tff_admin_loggedIn') === 'true') {
            showAdminDashboard();
            return;
        }
        const user = JSON.parse(localStorage.getItem('tff_currentUser'));
        if (user) {
            currentUser = user;
            loadUserData();
            showDashboard();
        } else {
            showLoginScreen();
        }
    };

    const login = (provider) => {
        // Step 1 of login: ask for name
        pendingProvider = provider;
        fanNameInput.value = '';
        nameModal.classList.remove('hidden');
    };

    const completeLogin = (name) => {
        // Step 2 of login: create user with the provided name
        currentUser = {
            id: `user_${pendingProvider.toLowerCase()}_${Date.now()}`,
            name: name,
            provider: pendingProvider,
        };
        localStorage.setItem('tff_currentUser', JSON.stringify(currentUser));
        loadUserData();
        nameModal.classList.add('hidden');
        showDashboard();
    };

    const logout = () => {
        // Limpiamos los datos de la sesión del navegador al salir.
        localStorage.removeItem('tff_currentUser');
        currentUser = null;
        userData = {};
        showLoginScreen();
    };

    const showLoginScreen = () => {
        showScreen(loginScreen);
    };

    const showDashboard = () => {
        userNameEl.textContent = `Hola, ${currentUser.name}`;
        updateUI();
        showScreen(dashboard);
        
        // Start Spotify polling if we have a token
        spotifyAccessToken = localStorage.getItem(`spotify_token_${currentUser.id}`);
        if (spotifyAccessToken) {
            updateSpotifyUI(true);
            startSpotifyPolling();
        } else {
            updateSpotifyUI(false);
        }
    };


    // --- DATA MANAGEMENT ---
    // Los datos del usuario (balance, recompensas, acciones) se guardan en el localStorage del navegador.
    // Esto asegura que la información persista entre diferentes sesiones para cada usuario.
    const loadUserData = () => {
        const data = JSON.parse(localStorage.getItem(currentUser.id));
        if (data) {
            userData = data;
        } else {
            // Initialize data for a new user
            userData = {
                name: currentUser.name,
                provider: currentUser.provider,
                balance: 0,
                rewards: {
                    photos: [] // Store unlocked photos here
                },
                actions: {},
                listenedSongs: [], // Track listened songs for Spotify
                createdAt: new Date().toISOString()
            };
        }
        // Ensure older data structures are compatible
        if (!userData.rewards.photos) {
            userData.rewards.photos = [];
        }
        if (!userData.rewards.shoutout) {
            userData.rewards.shoutout = {};
        }
        if (!userData.rewards.merch) {
            userData.rewards.merch = {};
        }
    };

    const saveUserData = () => {
        if (currentUser) {
            // Se guardan los datos del usuario actual en localStorage usando su ID único como clave.
            // Cada vez que se ganan tokens o se canjea una recompensa, se llama a esta función.
            localStorage.setItem(currentUser.id, JSON.stringify(userData));
        }
    };

    // --- UI & LOGIC ---
    const updateBalanceDisplay = () => {
        balanceEl.textContent = userData.balance;
        balanceEl.style.transform = 'scale(1.2)';
        balanceEl.style.transition = 'transform 0.2s ease-in-out';
        setTimeout(() => {
            balanceEl.style.transform = 'scale(1)';
        }, 200);
    };

    const updateRedeemButtonsState = () => {
        redeemButtons.forEach(button => {
            const cost = parseInt(button.dataset.cost);
            const card = button.closest('.reward-card');
            const rewardId = card.dataset.reward;
            
            if (rewardId === 'photo') {
                const unlockedCount = userData.rewards.photos.length;
                photoRewardStatusEl.textContent = `${unlockedCount}/${TOTAL_EXCLUSIVE_PHOTOS} Desbloqueadas`;
                if (unlockedCount >= TOTAL_EXCLUSIVE_PHOTOS) {
                    button.disabled = true;
                    button.textContent = 'Todas Desbloqueadas';
                    button.classList.add('redeemed');
                } else if (userData.balance < cost) {
                    button.disabled = true;
                    button.textContent = 'Tokens insuficientes';
                } else {
                    button.disabled = false;
                    button.textContent = 'Obtener Foto';
                    button.classList.remove('redeemed');
                }
            } else if (userData.rewards[rewardId] && userData.rewards[rewardId].redeemed) {
                button.disabled = true;
                button.textContent = 'Canjeado';
                button.classList.add('redeemed');
            } else if (userData.balance < cost) {
                button.disabled = true;
                button.textContent = 'Tokens insuficientes';
            } else {
                button.disabled = false;
                button.textContent = 'Canjear';
                button.classList.remove('redeemed');
            }
        });
    };
    
    const updateEarnButtonsState = () => {
        // Follow button
        if (userData.actions['follow']) {
            followBtn.disabled = true;
            followBtn.textContent = '¡Gracias!';
        } else {
            followBtn.disabled = false;
            followBtn.textContent = 'Lo seguí';
        }
        
        // Share button
        if (userData.actions['share']) {
            shareBtn.disabled = true;
            shareBtn.textContent = '¡Gracias por compartir!';
        } else {
            shareBtn.disabled = false;
            shareBtn.textContent = 'Compartir ahora';
        }
    };

    const updateGallery = () => {
        photoGallery.innerHTML = '';
        if (userData.rewards.photos && userData.rewards.photos.length > 0) {
            gallerySection.classList.remove('hidden');
            userData.rewards.photos.forEach(photoSrc => {
                const img = document.createElement('img');
                img.src = photoSrc;
                img.alt = "Foto Exclusiva";
                img.classList.add('gallery-thumbnail');
                img.addEventListener('click', () => showUnlockedPhoto(photoSrc, false));
                photoGallery.appendChild(img);
            });
        } else {
            gallerySection.classList.add('hidden');
        }
    };

    const updateUI = () => {
        updateBalanceDisplay();
        updateRedeemButtonsState();
        updateEarnButtonsState();
        updateGallery();
    };

    // --- SPOTIFY INTEGRATION ---

    const redirectToSpotifyAuth = () => {
        if (SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID') {
            alert('Configuración requerida: Por favor, añade tu Spotify Client ID en el archivo app.js.');
            return;
        }
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}`;
        window.location.href = authUrl;
    };

    const getSpotifyTokenFromURL = () => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');

        if (token) {
            // Token found, clear the hash from the URL
            window.location.hash = '';
            // We need to associate the token with the logged-in user.
            // checkLoginState will run after this and load the user.
            const user = JSON.parse(localStorage.getItem('tff_currentUser'));
            if (user) {
                localStorage.setItem(`spotify_token_${user.id}`, token);
                spotifyAccessToken = token;
            }
        }
    };

    const updateSpotifyUI = (isConnected) => {
        if (isConnected) {
            spotifyDisconnectedView.classList.add('hidden');
            spotifyConnectedView.classList.remove('hidden');
        } else {
            spotifyDisconnectedView.classList.remove('hidden');
            spotifyConnectedView.classList.add('hidden');
        }
    };

    const startSpotifyPolling = () => {
        if (spotifyPollingInterval) clearInterval(spotifyPollingInterval);
        if (!spotifyAccessToken) return;

        spotifyPollingInterval = setInterval(fetchCurrentlyPlaying, 15000); // Poll every 15 seconds
        fetchCurrentlyPlaying(); // Initial fetch
    };

    const stopSpotifyPolling = () => {
        if (spotifyPollingInterval) {
            clearInterval(spotifyPollingInterval);
            spotifyPollingInterval = null;
        }
    };

    const fetchCurrentlyPlaying = async () => {
        if (!spotifyAccessToken) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${spotifyAccessToken}`
                }
            });

            if (response.status === 204 || !response.ok) {
                // 204 means no content (nothing playing).
                // Handle other errors, like expired token (401)
                if (response.status === 401) {
                    // Token expired, needs re-authentication
                    localStorage.removeItem(`spotify_token_${currentUser.id}`);
                    spotifyAccessToken = null;
                    stopSpotifyPolling();
                    updateSpotifyUI(false);
                }
                 spotifyCurrentTrack.classList.add('hidden');
                 spotifyPlayerInfo.querySelector('p').textContent = 'Reproduce una canción en Spotify para ganar tokens.';
                return;
            }

            const data = await response.json();

            if (data && data.is_playing && data.item) {
                const songId = data.item.id;
                
                spotifyTrackName.textContent = data.item.name;
                spotifyArtistName.textContent = data.item.artists.map(a => a.name).join(', ');
                spotifyCurrentTrack.classList.remove('hidden');
                spotifyPlayerInfo.querySelector('p').textContent = '';

                if (!userData.listenedSongs.includes(songId)) {
                    userData.balance += 5;
                    userData.listenedSongs.push(songId);
                    saveUserData();
                    updateUI();
                    console.log(`+5 TFF for listening to ${data.item.name}`);
                }
            } else {
                 spotifyCurrentTrack.classList.add('hidden');
                 spotifyPlayerInfo.querySelector('p').textContent = 'Reproduce una canción en Spotify para ganar tokens.';
            }

        } catch (error) {
            console.error('Error fetching from Spotify:', error);
            stopSpotifyPolling();
        }
    };

    // --- MODAL & GALLERY LOGIC ---

    const showUnlockedPhoto = (photoSrc, isNew) => {
        unlockedPhotoEl.src = photoSrc;
        downloadPhotoBtn.href = photoSrc;
        downloadPhotoBtn.setAttribute('download', photoSrc.split('/').pop());

        if (isNew) {
            photoModal.querySelector('h2').textContent = '¡Foto Exclusiva Desbloqueada!';
            photoModal.querySelector('p').textContent = 'Has añadido una nueva foto a tu colección. ¡Sigue apoyando para conseguirlas todas!';
        } else {
            photoModal.querySelector('h2').textContent = 'Foto de tu Galería';
            photoModal.querySelector('p').textContent = 'Aquí tienes una de las fotos exclusivas que has desbloqueado.';
        }

        photoModal.classList.remove('hidden');
    };

    const redeemExclusivePhoto = (button) => {
        const cost = parseInt(button.dataset.cost);
        if (userData.balance >= cost) {
            const availablePhotos = exclusivePhotos.filter(p => !userData.rewards.photos.includes(p));
            
            if (availablePhotos.length > 0) {
                const randomPhoto = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
                
                userData.balance -= cost;
                userData.rewards.photos.push(randomPhoto);
                saveUserData();
                updateUI();
                
                showUnlockedPhoto(randomPhoto, true);
            } else {
                alert("¡Felicidades! Ya has conseguido todas las fotos exclusivas.");
                updateUI();
            }
        }
    };


    // --- SHARE LOGIC ---
    const openShareModal = () => {
        const shareUrl = "https://open.spotify.com/artist/3wcj1jnsUZvD1Eryg3flAD"; // Example artist URL
        const shareText = `Estoy escuchando a Eduardo Robles Espinosa, un artista increíble. ¡Deberías escucharlo! #EduardoRoblesEspinosa #TFF`;

        twitterShareLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        facebookShareLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        whatsappShareLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;

        shareModal.classList.remove('hidden');
    };

    const closeShareModal = () => {
        shareModal.classList.add('hidden');
    };

    const closeModal = () => {
        shareModal.classList.add('hidden');
        photoModal.classList.add('hidden');
        shoutoutModal.classList.add('hidden');
        merchModal.classList.add('hidden');
        editUserModal.classList.add('hidden');
        deleteConfirmModal.classList.add('hidden');
        // We don't close the name modal here, it's part of the login flow
    }

    // --- ADMIN LOGIC ---
    const showAdminLogin = () => {
        adminLoginError.classList.add('hidden');
        adminLoginForm.reset();
        showScreen(adminLoginScreen);
    };

    const handleAdminLogin = (event) => {
        event.preventDefault();
        const username = adminLoginForm.querySelector('#username').value;
        const password = adminLoginForm.querySelector('#password').value;

        if (username === 'eduroes' && password === 'Pass@w0rd1') {
            sessionStorage.setItem('tff_admin_loggedIn', 'true');
            showAdminDashboard();
        } else {
            adminLoginError.classList.remove('hidden');
        }
    };
    
    const adminLogout = () => {
        sessionStorage.removeItem('tff_admin_loggedIn');
        showLoginScreen();
    };
    
    const showAdminDashboard = () => {
        loadAllUsersData();
        showScreen(adminDashboard);
    };

    const loadAllUsersData = () => {
        userListTbody.innerHTML = ''; // Clear existing table
        const users = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // We ensure we are only loading user data, not other localStorage items
            if (key.startsWith('user_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    // Basic validation to check if it's a user data object
                    if (data && typeof data.balance !== 'undefined' && data.name) {
                        data.id = key; // Add the localStorage key as the user ID
                        users.push(data);
                    }
                } catch (e) {
                    console.error(`Could not parse user data for key: ${key}`, e);
                }
            }
        }

        // Sort users by creation date
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (users.length === 0) {
            userListTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay usuarios registrados.</td></tr>';
            return;
        }
        
        const rewardNames = {
            photo: 'Foto Exclusiva',
            shoutout: 'Saludo',
            merch: '15% Descuento'
        };
        
        users.forEach(user => {
            const row = document.createElement('tr');
            const registrationDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            const provider = user.provider || 'Desconocido';
            const songsListened = user.listenedSongs ? user.listenedSongs.length : 0;
            
            let redeemedRewardsList = [];
            if(user.rewards) {
                if (user.rewards.photos && user.rewards.photos.length > 0) {
                    redeemedRewardsList.push(`Fotos (${user.rewards.photos.length})`);
                }
                Object.keys(user.rewards).forEach(key => {
                    if(key !== 'photos' && user.rewards[key] && user.rewards[key].redeemed){
                         let detail = rewardNames[key] || key;
                         if (key === 'shoutout' && user.rewards[key].name) {
                             detail += ` (${user.rewards[key].name})`;
                         }
                         if (key === 'merch' && user.rewards[key].code) {
                             detail += ` (${user.rewards[key].code})`;
                         }
                         redeemedRewardsList.push(detail);
                    }
                });
            }
            const redeemedRewards = redeemedRewardsList.length > 0 ? redeemedRewardsList.join(', ') : 'Ninguna';

            row.innerHTML = `
                <td>${user.name || 'Usuario sin nombre'}</td>
                <td>${provider}</td>
                <td>${user.balance}</td>
                <td>${songsListened}</td>
                <td>${redeemedRewards}</td>
                <td>${registrationDate}</td>
                <td>
                    <button class="btn-admin-action edit" data-userid="${user.id}">Editar</button>
                    <button class="btn-admin-action delete" data-userid="${user.id}">Eliminar</button>
                </td>
            `;
            userListTbody.appendChild(row);
        });
    };

    const openEditModal = (userId) => {
        const userData = JSON.parse(localStorage.getItem(userId));
        if (!userData) {
            console.error("User not found for editing:", userId);
            return;
        }
        editUserIdInput.value = userId;
        editFanNameInput.value = userData.name;
        editTffBalanceInput.value = userData.balance;
        editUserModal.classList.remove('hidden');
    };

    const handleEditUser = (event) => {
        event.preventDefault();
        const userId = editUserIdInput.value;
        const newName = editFanNameInput.value;
        const newBalance = parseInt(editTffBalanceInput.value, 10);

        const userData = JSON.parse(localStorage.getItem(userId));
        if (userData) {
            userData.name = newName;
            userData.balance = newBalance;
            localStorage.setItem(userId, JSON.stringify(userData));
            closeModal();
            loadAllUsersData(); // Refresh the table
        }
    };

    const openDeleteConfirmModal = (userId) => {
        confirmDeleteBtn.dataset.userIdToDelete = userId;
        deleteConfirmModal.classList.remove('hidden');
    };
    
    const handleDeleteUser = () => {
        const userId = confirmDeleteBtn.dataset.userIdToDelete;
        if (userId) {
            localStorage.removeItem(userId);
            delete confirmDeleteBtn.dataset.userIdToDelete;
            closeModal();
            loadAllUsersData(); // Refresh the table
        }
    };


    // --- EVENT LISTENERS ---
    loginButtons.forEach(button => {
        button.addEventListener('click', () => {
            login(button.dataset.provider);
        });
    });
    
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = fanNameInput.value.trim();
        if (name) {
            completeLogin(name);
        }
    });

    logoutButton.addEventListener('click', () => {
        stopSpotifyPolling();
        logout();
    });

    adminLogoutButton.addEventListener('click', () => {
        stopSpotifyPolling();
        adminLogout();
    });

    adminLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAdminLogin();
    });

    backToUserLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginScreen();
    });
    
    adminLoginForm.addEventListener('submit', handleAdminLogin);

    userListTbody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-admin-action')) {
            const userId = target.dataset.userid;
            if (target.classList.contains('edit')) {
                openEditModal(userId);
            } else if (target.classList.contains('delete')) {
                openDeleteConfirmModal(userId);
            }
        }
    });

    editUserForm.addEventListener('submit', handleEditUser);
    confirmDeleteBtn.addEventListener('click', handleDeleteUser);
    cancelDeleteBtn.addEventListener('click', closeModal);

    spotifyConnectBtn.addEventListener('click', redirectToSpotifyAuth);
    
    shareBtn.addEventListener('click', () => {
        if (!userData.actions['share']) {
            userData.balance += 25;
            userData.actions['share'] = true;
            saveUserData();
            updateUI();
            openShareModal();
        }
    });

    followBtn.addEventListener('click', () => {
        if (!userData.actions['follow']) {
            userData.balance += 50;
            userData.actions['follow'] = true;
            saveUserData();
            updateUI();
        }
    });

    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (event) => {
        if (event.target == shareModal || event.target == photoModal || event.target == shoutoutModal || event.target == merchModal || event.target == editUserModal || event.target == deleteConfirmModal) {
            closeModal();
        }
    });

    redeemButtons.forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.reward-card');
            const rewardId = card.dataset.reward;
            const cost = parseInt(button.dataset.cost);

            // Check for sufficient balance and if already redeemed
            if (userData.balance < cost || (userData.rewards[rewardId] && userData.rewards[rewardId].redeemed)) {
                return;
            }

            // Handle specific rewards
            if (rewardId === 'photo') {
                redeemExclusivePhoto(button);
            } else if (rewardId === 'shoutout') {
                shoutoutModal.classList.remove('hidden');
                // The rest of the logic is in the form submit handler
            } else if (rewardId === 'merch') {
                const code = `EDUROES15-${currentUser.id.slice(-4).toUpperCase()}${Date.now().toString().slice(-4)}`;
                
                userData.balance -= cost;
                userData.rewards.merch = { redeemed: true, code: code, date: new Date().toISOString() };
                saveUserData();
                updateUI();
                
                merchCodeEl.textContent = code;
                merchModal.classList.remove('hidden');
            } else { // Fallback for any other simple reward
                userData.balance -= cost;
                userData.rewards[rewardId] = { redeemed: true };
                alert(`¡Felicidades! Has canjeado "${card.querySelector('h3').textContent}".`);
                saveUserData();
                updateUI();
            }
        });
    });

    shoutoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cost = 500; // Hardcoded cost for shoutout
        const name = shoutoutNameInput.value.trim();

        if (name && userData.balance >= cost) {
            userData.balance -= cost;
            userData.rewards.shoutout = { redeemed: true, name: name, date: new Date().toISOString() };
            saveUserData();
            updateUI();
            closeModal();
            shoutoutForm.reset();
            alert(`¡Genial! Tu petición para un saludo para "${name}" ha sido enviada.`);
        }
    });

    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(merchCodeEl.textContent).then(() => {
            const originalText = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = 'Copiado!';
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });


    // --- INITIALIZATION ---
    checkLoginState();
});
