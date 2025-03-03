// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAFQFJ2beGKRhnXjio8LDt9ccZnpYdXbqM",
    authDomain: "spj48tv-diraproj.firebaseapp.com",
    databaseURL: "https://spj48tv-diraproj-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "spj48tv-diraproj",
    storageBucket: "spj48tv-diraproj.firebasestorage.app",
    messagingSenderId: "703495923567",
    appId: "1:703495923567:web:4044d8a739085563de2a9a",
    measurementId: "G-HDLQDDWHE7"
};

// Fungsi enkripsi menggunakan key tetap
function encrypt(data) {
    // Key tetap 32-byte
    const key = window.CryptoJS.enc.Utf8.parse('62b3d0d0-e0cb-4b25-bbf6-4ce29ce2');
    // Generate IV random
    const iv = window.CryptoJS.lib.WordArray.random(16);

    const encrypted = window.CryptoJS.AES.encrypt(
        JSON.stringify(data),
        key,
        { iv: iv }
    );

    return iv.toString(window.CryptoJS.enc.Hex) +
        encrypted.ciphertext.toString(window.CryptoJS.enc.Hex);
}

// Fungsi untuk mendekripsi data terenkripsi
function decrypt(encryptedHex) {
    try {
        // Key tetap 32-byte (sama dengan yang digunakan di server)
        const key = window.CryptoJS.enc.Utf8.parse('62b3d0d0-e0cb-4b25-bbf6-4ce29ce2');
        
        // Convert hex string ke WordArray
        const encryptedBytes = window.CryptoJS.enc.Hex.parse(encryptedHex);
        
        // Pisahkan IV (16 bytes pertama) dan encrypted data
        const iv = window.CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(0, 4));
        const encryptedText = window.CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(4));
        
        // Dekripsi data
        const decrypted = window.CryptoJS.AES.decrypt(
            { 
                ciphertext: encryptedText 
            },
            key,
            { 
                iv: iv,
                mode: window.CryptoJS.mode.CBC,
                padding: window.CryptoJS.pad.Pkcs7
            }
        );
        
        // Parse JSON hasil dekripsi
        const decoded = JSON.parse(decrypted.toString(window.CryptoJS.enc.Utf8));
        
        // Validasi timestamp (5 menit)
        const now = Date.now();
        if (now - decoded.timestamp > 5 * 60 * 1000) {
            throw new Error('Data telah kadaluarsa');
        }

        return decoded;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Gagal mendekripsi data: ' + error.message);
    }
}

const fb = encrypt(firebaseConfig);
console.log(fb);
const fb2 = decrypt(fb);
console.log(fb2);

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let player; // Plyr instance

// Deklarasi fungsi loading di awal
function showLoadingSpinner() {
    const loadingContent = document.querySelector('.loading-content');
    if (loadingContent) {
        loadingContent.style.display = 'flex';
        setTimeout(() => {
            loadingContent.style.opacity = '1';
        }, 10);
    }
}

function hideLoadingSpinner() {
    const loadingContent = document.querySelector('.loading-content');
    if (loadingContent) {
        loadingContent.style.opacity = '0';
        setTimeout(() => {
            loadingContent.style.display = 'none';
        }, 300);
    }
}

function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        setTimeout(() => {
            loadingOverlay.style.opacity = '1';
        }, 10);
    }
}

function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
    }
}

function showLoading() {
    showLoadingSpinner();
    showLoadingOverlay();
}

function hideLoading() {
    hideLoadingSpinner();
    hideLoadingOverlay();
}

// Inisialisasi FingerprintJS
async function initFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
}

// Tambahkan fungsi untuk cek status show
async function checkShowStatus(showId) {
    try {
        const response = await fetch(`http://localhost:3030/api/theater-shows/status/${showId}`, {
            headers: {
                'x-api-key': 'zeyydevv012'
            }
        });
        const data = await response.json();
        
        return {
            isLive: data.isLive,
            data: data.data,
            startTime: data.startTime, // Unix timestamp
            showTitle: data.title
        };
    } catch (error) {
        console.error('Error checking show status:', error);
        return null;
    }
}

// Update fungsi showWaiting
const showWaiting = () => {
    const container = document.querySelector('.container');
    hideLoadingSpinner();
    hideLoadingOverlay();
    
    container.innerHTML = `
        <div class="waiting-container">
            <img src="/stream/src/images/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
            <div class="loader"></div>
            <h2>Menunggu Stream</h2>
            <p>Mohon tunggu sebentar...</p>
        </div>
    `;
};

// Update fungsi showError
const showError = (message) => {
    const container = document.querySelector('.container');
    hideLoadingSpinner();
    hideLoadingOverlay();
    
    container.innerHTML = `
        <div class="error-container">
            <img src="/stream/src/images/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
            <div class="error-icon">⚠️</div>
            <h2 class="error-message">Error</h2>
            <p class="error-description">${message}</p>
        </div>
    `;
};

// Update fungsi showDeviceError
const showDeviceError = () => {
    hideLoadingSpinner();
    hideLoadingOverlay();
    showError('Token ini sudah digunakan di perangkat lain');
};

// Update fungsi initStream untuk menggunakan decryptFromNumbers
const initStream = async (streamUrl) => {
    try {
        const token = window.location.hash.substring(1);

        // Fungsi enkripsi menggunakan key tetap
        const encryptData = (token, url) => {
            // Key tetap 32-byte
            const key = window.CryptoJS.enc.Utf8.parse('62b3d0d0-e0cb-4b25-bbf6-4ce29ce2');
            // Generate IV random
            const iv = window.CryptoJS.lib.WordArray.random(16);
            
            const data = {
                token: token,
                streamUrl: url,
                timestamp: Date.now()
            };
            
            const encrypted = window.CryptoJS.AES.encrypt(
                JSON.stringify(data),
                key,
                { iv: iv }
            );

            return iv.toString(window.CryptoJS.enc.Hex) + 
                   encrypted.ciphertext.toString(window.CryptoJS.enc.Hex);
        };

        // Enkripsi data
        const encryptedPayload = encryptData(token, streamUrl);
        const proxyUrl = `http://localhost:3000/api/stream/playlist/${encryptedPayload}`;

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 404) {
                showWaiting();
                return;
            }
            throw new Error(error.error || 'Gagal memuat stream');
        }

        let playlist = await response.text();
        if (!playlist.startsWith('#EXTM3U')) {
            showWaiting();
            return;
        }

        // Ambil base URL dari playlist
        const lines = playlist.split('\n');
        let baseUrl = '';
        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                // Ambil path dari URL pertama yang ditemukan
                const urlParts = line.split('/');
                urlParts.pop(); // Hapus nama file
                baseUrl = urlParts.join('/');
                break;
            }
        }

        // Modifikasi URL di dalam playlist
        playlist = playlist.split('\n').map(line => {
            if (line.trim() && !line.startsWith('#')) {
                // Jika line adalah URL (tidak dimulai dengan #)
                const fileName = line.split('/').pop(); // Ambil nama file saja
                return `${baseUrl}/${fileName}`;
            }
            return line;
        }).join('\n');

        // Buat Blob dari playlist yang sudah dimodifikasi
        const blob = new Blob([playlist], { type: 'application/x-mpegURL' });
        const blobUrl = URL.createObjectURL(blob);

        // Log untuk debugging
        console.log('Original playlist:', playlist);
        console.log('Base URL:', baseUrl);
        console.log('Modified playlist:', playlist);
        console.log('Blob URL:', blobUrl);

        // Inisialisasi atau update player
        if (!player) {
            player = new Plyr('#streamPlayer', {
                controls: [
                    'play-large', 
                    'play', 
                    'progress', 
                    'current-time',
                    'duration',
                    'mute', 
                    'volume', 
                    'settings',
                    'fullscreen'
                ],
                settings: ['quality', 'speed'],
                quality: {
                    default: 720,
                    options: [2160, 1440, 1080, 720, 480, 360, 240, 144],
                    forced: true,
                    onChange: (quality) => updateQuality(quality)
                }
            });

            // Inisialisasi Hls.js
            if (Hls.isSupported()) {
                const hls = new Hls({
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    maxBufferSize: 60 * 1000 * 1000, // 60MB
                    maxBufferHole: 0.5,
                    lowLatencyMode: true
                });

                hls.loadSource(blobUrl);
                hls.attachMedia(document.querySelector('#streamPlayer'));

                // Log untuk debugging
                console.log('Playlist content:', playlist);
                console.log('Base URL:', baseUrl);
                console.log('Blob URL:', blobUrl);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('Manifest parsed, levels:', hls.levels);
                    const availableQualities = hls.levels.map((l) => l.height);
                    player.quality = {
                        default: 720,
                        options: availableQualities,
                        forced: true,
                        onChange: (quality) => {
                            hls.levels.forEach((level, levelIndex) => {
                                if (level.height === quality) {
                                    hls.currentLevel = levelIndex;
                                }
                            });
                        }
                    };
                    player.play();
                });

                // Handle errors
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('Network error, trying to recover...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('Fatal error, stopping:', data);
                                hls.destroy();
                                URL.revokeObjectURL(blobUrl);
                                showError('Terjadi kesalahan saat memutar stream');
                                break;
                        }
                    }
                });

                // Cleanup
                player.on('destroy', () => {
                    hls.destroy();
                    URL.revokeObjectURL(blobUrl);
                });

            } else if (player.media.canPlayType('application/vnd.apple.mpegurl')) {
                player.source = {
                    type: 'video',
                    sources: [{
                        src: blobUrl,
                        type: 'application/x-mpegURL'
                    }]
                };
            }
        }

        document.getElementById('showInfo').textContent = 'Stream siap diputar';
        showStreamContainer();

    } catch (error) {
        console.error('Error initializing stream:', error);
        showError(error.message);
    }
};

// Fungsi untuk update kualitas video
const updateQuality = (quality) => {
    if (player && player.source) {
        const currentTime = player.currentTime;
        player.source = {
            ...player.source,
            size: quality
        };
        player.currentTime = currentTime;
        player.play();
    }
};

// Fungsi untuk polling waktu show
function startShowTimePolling(showId) {
    const pollInterval = setInterval(async () => {
        const status = await checkShowStatus(showId);
        if (status?.isLive) {
            clearInterval(pollInterval);
            if (status.data) {
                const decryptedData = decryptFromNumbers(status.data);
                initStream(`https://api.idn.app/api/v1/livestream/playback-token?streamer_uuid=${decryptedData.streamerUuid}&slug=${decryptedData.slug}&n=1`);
            } else {
                showWaiting();
                startStreamUrlPolling(showId);
            }
        }
    }, 10000);
}

// Update fungsi polling stream URL
function startStreamUrlPolling(showId) {
    const pollInterval = setInterval(async () => {
        try {
            const status = await checkShowStatus(showId);
            if (status?.data) {
                const response = await fetch(`http://localhost:3000/api/stream/playlist/${token}`);
                const playlist = await response.text();
                
                if (playlist.startsWith('#EXTM3U')) {
                    clearInterval(pollInterval);
                    const decryptedData = decryptFromNumbers(status.data);
                    initStream(`https://api.idn.app/api/v1/livestream/playback-token?streamer_uuid=${decryptedData.streamerUuid}&slug=${decryptedData.slug}&n=1`);
                } else if (playlist.includes('"error": "Can not find channel"')) {
                    console.log('Stream belum tersedia');
                }
            }
        } catch (error) {
            console.error('Error polling stream:', error);
        }
    }, 5000);
}

// Update fungsi showCountdown
function showCountdown(startTimeMs, showTitle) {
    const container = document.querySelector('.container');
    const countdown = () => {
        const now = new Date().getTime();
        const distance = startTimeMs - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            showWaiting();
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        container.innerHTML = `
            <div class="countdown-container">
                <img src="/stream/src/images/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
                <h2>${showTitle}</h2>
                <div class="loader"></div>
                <h3>Show akan dimulai dalam</h3>
                <div class="countdown">
                    ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
                </div>
            </div>
        `;
    };

    countdown();
    const countdownInterval = setInterval(countdown, 1000);
}

function showStreamContainer() {
    const streamContainer = document.getElementById('streamingContainer');
    const tokenContainer = document.getElementById('tokenInput');
    
    // Fade out token container
    tokenContainer.style.opacity = '0';
    setTimeout(() => {
        tokenContainer.style.display = 'none';
        
        // Show and fade in stream container
        streamContainer.classList.remove('hidden');
        requestAnimationFrame(() => {
            streamContainer.classList.add('visible');
        });
    }, 300);
}

// Fungsi validasi token
async function validateToken() {
    const token = window.location.hash.substring(1);
    showLoadingSpinner();
    
    if (!token) {
        hideLoadingSpinner();
        hideLoadingOverlay();
        showError('Token tidak ditemukan!');
        return;
    }

    try {
        // Validasi token dan fingerprint
        const fp = await FingerprintJS.load();
        const fingerprint = (await fp.get()).visitorId;
        const tokenData = (await get(ref(db, `tokens/${token}`))).val();

        if (!tokenData || !tokenData.showId) {
            hideLoadingSpinner();
            hideLoadingOverlay();
            showError('Token tidak valid!');
            return;
        }

        if (tokenData.fingerprint && tokenData.fingerprint !== fingerprint) {
            hideLoadingSpinner();
            hideLoadingOverlay();
            showDeviceError();
            return;
        }

        // Update fingerprint jika belum ada
        if (!tokenData.fingerprint) {
            await update(ref(db, `tokens/${token}`), {
                fingerprint,
                lastAccess: new Date().toISOString()
            });
        }

        // Cek status show
        const showStatus = await checkShowStatus(tokenData.showId);
        if (!showStatus) {
            hideLoadingSpinner();
            hideLoadingOverlay();
            showError('Show tidak ditemukan');
            return;
        }

        document.getElementById('showTitle').textContent = showStatus.showTitle;
        hideLoadingSpinner();
        hideLoadingOverlay();

        if (!showStatus.isLive) {
            showCountdown(showStatus.startTime * 1000, showStatus.showTitle);
            startShowTimePolling(tokenData.showId);
            return;
        }

        if (!showStatus.data) {
            showWaiting();
            startStreamUrlPolling(tokenData.showId);
            return;
        }

        // initStream(showStatus.streamUrl);
        const decryptedData = decryptFromNumbers(showStatus.data);
        initStream(`https://api.idn.app/api/v1/livestream/playback-token?streamer_uuid=${decryptedData.streamerUuid}&slug=${decryptedData.slug}&n=1`);
        // startActivityTracking(token);
    } catch (error) {
        hideLoadingSpinner();
        hideLoadingOverlay();
        showError(`Error: ${error.message}`);
    }
}

// Fungsi untuk melacak aktivitas pengguna
const startActivityTracking = async (token) => {
    try {
        // Referensi ke Firebase untuk token ini
        const tokenRef = ref(db, `tokens/${token}`);
        
        // Update last activity timestamp setiap 30 detik
        const activityInterval = setInterval(async () => {
            try {
                const snapshot = await get(tokenRef);
                const tokenData = snapshot.val();

                if (!tokenData) {
                    console.warn('Token tidak ditemukan di database');
                    clearInterval(activityInterval);
                    return;
                }

                // Update last activity
                await update(tokenRef, {
                    lastActivity: Date.now(),
                    isActive: true
                });

            } catch (error) {
                console.error('Error updating activity:', error);
            }
        }, 30000); // 30 detik

        // Event listener untuk tab visibility
        document.addEventListener('visibilitychange', async () => {
            try {
                if (document.hidden) {
                    // Tab tidak aktif
                    await update(tokenRef, {
                        isActive: false,
                        lastInactive: Date.now()
                    });
                } else {
                    // Tab aktif kembali
                    await update(tokenRef, {
                        isActive: true,
                        lastActivity: Date.now()
                    });
                }
            } catch (error) {
                console.error('Error updating visibility status:', error);
            }
        });

        // Event listener untuk window unload
        window.addEventListener('beforeunload', async () => {
            try {
                await update(tokenRef, {
                    isActive: false,
                    lastInactive: Date.now()
                });
            } catch (error) {
                console.error('Error updating unload status:', error);
            }
        });

        // Inisialisasi status awal
        await update(tokenRef, {
            isActive: true,
            lastActivity: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

    } catch (error) {
        console.error('Error starting activity tracking:', error);
    }
};

// Event listeners di akhir file
window.addEventListener('DOMContentLoaded', () => {
    validateToken();
});

window.addEventListener('hashchange', () => {
    validateToken();
}); 