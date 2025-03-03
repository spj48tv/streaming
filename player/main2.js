// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

const ds = {
    d_fb: '4f3db70475b84c732cd95022d145b7c8f11dfdf96e1c777a2607c6d740513418405d67ce4d4bba54cbda6eb461f032c08acfa5b90d749a9866999c4eba0891567917e0674a8ad5f861c2db27dd617ddb76fe6cf750b70e14107586002e64923d5c173c7c8d1b3118edd2e3277683697c76844a0ae45b0afbf59f79f510d373eb422fe19f495275fe39a5761bf4e198cb74fc44752c4bdfdf02ecf2620e31911ea0c3f48b5d2b13257adeef335d9f94461e6a297dd10223757075c7390adb18e69a007c26b42da8cb16b185b78cbb30939ed94f658f2c48d047bad09763e5c0759104788924857429bfd420bb59494b6b4e2efaf94a068171aeadc82dd645cc6241c5de057bfedebf9497a3b82f1f2fb86b481958da85ec73b4a8a3a0da9b4a18f5ee8ad4d308496ea5a5d04f915b1c23e2081f7e8b80178bf2448adfb83ab0618ca3bd9d9b35a73d933bf6e9e24dbb3c4ec8a85410a028f4abd65db09c10fca31c4a6259dcb04324d77d06fd7ab1d0490ad7da8a07dd3578200e922247ed96d5da4bcca500c482740ddec64b5d519ee5a7bdd22dc8e2beac1fd17a8a282ce9cb',
    d_s1_url: '386813dc8d4eb6e2dfcfc5056f120bd79f6da531df5f07f74766af2ed110207fd4e1cecb03474b8ee199b9698e9ccec696a818133fbd26a240e2d8074687b117120fbb4b367e9da86692cc2f432ae38e',
    d_s2_url: '301abc36e7fee9e968e1b45564270ac1d1c34b7b19fad9bb33928203041af26f6a0d9171b11b44ae85ff0d8c9146be2a9dc221151a1756b2b37f0cbc3a89bb8e834e3a00a75bdda23aeb2bc9e7f0d513',
    d_ms_k: 'b23016f7292118f6ca887f2c925899ea3e4ca7296aaf11b24682a65635baa5f46a08c63d9638e13fc50a28e65d2d30c7'
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
        
        // Cek apakah hasil dekripsi adalah JSON, jika ya maka parse
        let decoded;
        try {
            decoded = JSON.parse(decrypted.toString(window.CryptoJS.enc.Utf8));
        } catch (error) {
            decoded = decrypted.toString(window.CryptoJS.enc.Utf8);
        }
        
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

const generateApiKey = () => {
    const timestamp = Date.now().toString();
    const hash = window.CryptoJS.HmacSHA256(timestamp, decrypt(ds.d_ms_k)).toString();
    return `${timestamp}.${hash}`;
  };

// Inisialisasi Firebase
const app = initializeApp(decrypt(ds.d_fb));
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

// Fungsi untuk polling waktu show
function startShowTimePolling(showId) {
    const pollInterval = setInterval(async () => {
        const status = await checkShowStatus(showId);
        if (status?.isLive) {
            clearInterval(pollInterval);
            if (status.data) {
                const decryptedData = decrypt(status.data);
                initStream(decryptedData);
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
                clearInterval(pollInterval);
                const decryptedData = decrypt(status.data);
                initStream(decryptedData);
            }
        } catch (error) {
            console.error('Error polling stream:', error);
        }
    }, 5000);
}

// Update fungsi showCountdown
function showCountdown(startTimeMs, showTitle) {
    const container = document.querySelector('.container');
    let countdownInterval; // Deklarasi di awal fungsi
    
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
                <img src="../assets/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
                <h2>${showTitle}</h2>
                <div class="loader"></div>
                <h3>Show akan dimulai dalam</h3>
                <div class="countdown">
                    ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
                </div>
            </div>
        `;
    };

    countdown(); // Panggil sekali di awal
    countdownInterval = setInterval(countdown, 1000); // Set interval
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

// Tambahkan fungsi untuk cek status show
async function checkShowStatus(showId) {
    try {
        const url = decrypt(ds.d_s1_url);
        const response = await fetch(`${url}/${showId}`, {
            headers: {
                'x-api-key': generateApiKey()
            }
        });
        const data = await response.json();
        
        return {
            isLive: data.isLive,
            data: data.data,
            startTime: data.startTime, // Unix timestamp
            showTitle: data.title,
            lineup: data.lineup
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
            <img src="../assets/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
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
            <img src="../assets/logo.png" alt="SPJ48 TV" class="logo-img" style="width: 200px; height: auto">
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
        const proxyUrl = `${decrypt(ds.d_s2_url)}/${encryptedPayload}`;

        const response = await fetch(proxyUrl);
        // const response = {
        //     ok: true,
        //     text: () => Promise.resolve('#EXTM3U\n#EXT-X-SESSION-DATA:DATA-ID=\"NODE\",VALUE=\"cloudfront_prod_sin03\"\n#EXT-X-SESSION-DATA:DATA-ID=\"MANIFEST-NODE-TYPE\",VALUE=\"weaver_cluster\"\n#EXT-X-SESSION-DATA:DATA-ID=\"MANIFEST-NODE\",VALUE=\"elastic-weaver.ase11-0\"\n#EXT-X-SESSION-DATA:DATA-ID=\"SUPPRESS\",VALUE=\"true\"\n#EXT-X-SESSION-DATA:DATA-ID=\"SERVER-TIME\",VALUE=\"1740662504.84\"\n#EXT-X-SESSION-DATA:DATA-ID=\"TRANSCODESTACK\",VALUE=\"2023-Transcode-QS-V1\"\n#EXT-X-SESSION-DATA:DATA-ID=\"USER-IP\",VALUE=\"103.186.30.46\"\n#EXT-X-SESSION-DATA:DATA-ID=\"SERVING-ID\",VALUE=\"a8bdd730381a49b9a04117cba3bd5dc8\"\n#EXT-X-SESSION-DATA:DATA-ID=\"CLUSTER\",VALUE=\"cloudfront_prod_sin03\"\n#EXT-X-SESSION-DATA:DATA-ID=\"ABS\",VALUE=\"true\"\n#EXT-X-SESSION-DATA:DATA-ID=\"VIDEO-SESSION-ID\",VALUE=\"4885533028415693565\"\n#EXT-X-SESSION-DATA:DATA-ID=\"BROADCAST-ID\",VALUE=\"314874514296\"\n#EXT-X-SESSION-DATA:DATA-ID=\"STREAM-TIME\",VALUE=\"5653.839032\"\n#EXT-X-SESSION-DATA:DATA-ID=\"FUTURE\",VALUE=\"true\"\n#EXT-X-SESSION-DATA:DATA-ID=\"USER-COUNTRY\",VALUE=\"ID\"\n#EXT-X-SESSION-DATA:DATA-ID=\"MANIFEST-CLUSTER\",VALUE=\"ase11-0\"\n#EXT-X-SESSION-DATA:DATA-ID=\"ORIGIN\",VALUE=\"sin03\"\n#EXT-X-SESSION-DATA:DATA-ID=\"C\",VALUE=\"aHR0cHM6Ly92aWRlby1lZGdlLWUzOTcwZC5zamMwNS5obHMubGl2ZS12aWRlby5uZXQvdjEvc2VnbWVudC9DbUg0NW81OXl1c2NrOS1XeV9kNUZKWmQ5eUxkSkZXdFVISUQtSzFyMVlINVlscHRzUUtCNllrQVJxY3lCaF9HR3AyZ0ZpN3ZTdURuTkJsYi1hNllMSjlTVGtYZFZQTnByM3doMnFncEs5SUNVOS1xNTJVcHVHYVRfLUc1Z3h2SV8yem9reUNQcGtFWk5kSEdWMlY1a21PU3lIVjZLTlpMUkk3NE1KN3lTWkNCVFJYUmp2UFJTR0wzR2JNS3FrcnJXYXNWNTRlTVAyYldKcjVrWlliTDAzZDJ1S2FvOG03NDdIR19wTlVNeUl2Nm5oZks3dTQ3dndGYTFZelVZWTNteGZzN1RXQXdlSVQwQW9WT1hCbnVGRVdEYW1MbDN0RnFEVDdNVnNuNDdBNkFSWGlvZFZIQ3NJdWJhUUZ3SUsyVGFsMXFQcGdvYjNrR3Z5N2stSDBacW1RcTJkcVd4Q2VTbmdoRnhDanlXRFdoZzRNZ1R3SWJScXg3dUdMeWtDb05IcFJQdGNNb1pUNHNPenQ2RWlLckVoaGFEa3AtUjdMYmlwZUtVZUtmdVFMUXZHSWU4YXQxNVNrN0NBRmw2TFJtQUVIazB3N2xkNG1YUzFVVzA1SHFzSG1NajJndmlBOGx1R1J4RmFqaHQ2SVVDck5iYzVLZFAtMDgxTUl1cGZyMUEzTVNkOGNlZVdnYUxvdVpHX3RncXRfQXBBOENyWTNoVzJQU3N4ZF9YOWVkOXdfbHJUUkVhY0pPQWtOWG80M2FsV0RxT1hJaVdqY2FRREN6RjIyV3pjSjNPdlZMQjFEX1k1WDR5bmJKMGs2ZkFnTVNuZEpVd0ZmN1hGZDdmQWE2WGMya3FQODJsWmd4NHlTQUJWcmh4UFBwbml0R1ZuWER0XzUzVmxFODNSNkgyekhNMnc2WVI4YURoNlVwNUk0SkVOR2NMY3hSaGM5SkhiNXU5LTh5Mjc2Vm1tX1gyZlBXQVd3NEJKV1kzNVFQMDI4VXY5R0o1TU03b2dJMnUxUEtZWFFhMDhhUDZLVFBHdWc1c1kySXRZYzM2LnRz\"\n#EXT-X-SESSION-DATA:DATA-ID=\"E\",VALUE=\"aHR0cHM6Ly92aWRlby1lZGdlLWUzOTcwZC5zamMwNS5obHMubGl2ZS12aWRlby5uZXQvdjEvc2VnbWVudC9DbUg0NW81OXl1c2NrOS1XeV9kNUZKWmQ5eUxkSkZXdFVISUQtSzFyMVlINVlscHRzUUtCNllrQVJxY3lCaF9HR3AyZ0ZpN3ZTdURuTkJsYi1hNllMSjlTVGtYZFZQTnByM3doMnFncEs5SUNVOS1xNTJVcHVHYVRfLUc1Z3h2SV8yem9reUNQcGtFWk5kSEdWMlY1a21PU3lIVjZLTlpMUkk3NE1KN3lTWkNCVFJYUmp2UFJTR0wzR2JNS3FrcnJXYXNWNTRlTVAyYldKcjVrWlliTDAzZDJ1S2FvOG03NDdIR19wTlVNeUl2Nm5oZks3dTQ3dndGYTFZelVZWTNteGZzN1RXQXdlSVQwQW9WT1hCbnVGRVdEYW1MbDN0RnFEVDdNVnNuNDdBNkFSWGlvZFZIQ3NJdWJhUUZ3SUsyVGFsMXFQcGdvYjNrR3Z5N2stSDBacW1RcTJkcVd4Q2VTbmdoRnhDanlXRFdoZzRNZ1R3SWJScXg3dUdMeWtDb05IcFJQdGNNb1pUNHNPenQ2RWlLckVoaGFEa3AtUjdMYmlwZUtVZUtmdVFMUXZHSWU4YXQxNVNrN0NBRmw2TFJtQUVIazB3N2xkNG1YUzFVVzA1SHFzSG1NajJndmlBOGx1R1J4RmFqaHQ2SVVDck5iYzVLZFAtMDgxTUl1cGZyMUEzTVNkOGNlZVdnYUxvdVpHX3RncXRfQXBBOENyWTNoVzJQU3N4ZF9YOWVkOXdfbHJUUkVhY0pPQWtOWG80M2FsV0RxT1hJaVdqY2FRREN6RjIyV3pjSjNPdlZMQjFEX1k1WDR5bmJKMGs2ZkFnTVNuZEpVd0ZmN1hGZDdmQWE2WGMya3FQODJsWmd4NHlTQUJWcmh4UFBwbml0R1ZuWER0XzUzVmxFODNSNkgyekhNMnc2WVI4YURoNlVwNUk0SkVOR2NMY3hSaGM5SkhiNXU5LTh5Mjc2Vm1tX1gyZlBXQVd3NEJKV1kzNVFQMDI4VXY5R0o1TU03b2dJMnUxUEtZWFFhMDhhUDZLVFBHdWc1c1kySXRZYzM2LnRz\"\n#EXT-X-SESSION-DATA:DATA-ID=\"CUSTOMER_ID\",VALUE=\"050891932989\"\n#EXT-X-SESSION-DATA:DATA-ID=\"CONTENT_ID\",VALUE=\"8wycCASofNbC\"\n#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID=\"chunked\",NAME=\"1080p60\",AUTOSELECT=YES,DEFAULT=YES\n#EXT-X-STREAM-INF:BANDWIDTH=9511634,RESOLUTION=1920x1080,CODECS=\"avc1.64002A,mp4a.40.2\",VIDEO=\"chunked\",FRAME-RATE=60.000\nhttps://ase11-0.playlist.live-video.net/v1/playlist/CrUFEJvqS_rkuSkIXuESPwVkDn4_K8K7Baz1S783OuMiCDGmVgr8NEvhUnocH-ooTUtunqNtl_nWF12x8V09RxBw6WwlmDjeZBRXn-f8VskuJxTJkdz_rZv6KDFKwokVOkFobGNzpc7ZZ-2miMrfLh_IhVJs_EqLdOCpnsiNFV-Cm_-VhP-tVYP1rGazfMPOz8ttycuGpRCJKn5e-RShh5JOKuISPFEdl30WS-yXTffQvSgCRhGj9jfw_7fH3RUokPuqcGOd4Egd4CrDQXKcBXD5RoDRLjNhs4zX86aatWMQ-EzshEb1oJhZ0MJRA7IyVNeovxGQ5udAFTTNYeP82M_4W1oWLgGn2AZtYbKGIXEk2BFYM99ArC4pK7G7i4WZGYqNOr6Q9TTs9jSo4NIM35_FKSqUnmheAjMOagaMyMPMV0k2JJWywaboYigalrqkN_wSuGGlHRGzYdvyZExdeY829lugpjodnDDMsR-lU2IIIISSRLZyeAUg0S0ActL-O_zUziFLY8FbJVqk3nE2NwGjWmLBi-GEU0IvcM35RbNMGuvBk8TT_RdafRemjkE7J_U-NrTTiB8DNPHxkp0DuRzoRRWJ9t9LPnjo2mYxmwo6gCt5H4QTwDgQuj5ULV6QS9Q9tmzJ6QWqglN6v7UZqVaIJ19exgquvBE2PGHIevyeNbaS2y4HU24V_rFBVhv5x1tvoMO6jNJdIuHxrIM7trm2eADNP_kT6NO5ozfLTth6jlq_CZBzbPPIu3T-oxOdJk4nQ_JkgquZgha-OUQ12qm4kyhUrOoYv-9viM-Cg0HvGpjZPnmujSjluzB6sQy78OvIN8Vt1keIGwuM8iLZnt4mSWTlmq5-g-Fj2xoZE8K0LyVVQdX7UqDu9gcaZi-LjVTP8CQyEEQZ85gfKVjT_hDrE8UibKHKGgzMmIJyj6sff7MgBUEgASoJdXMtd2VzdC0yMNYL.m3u8\n#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID=\"720p60\",NAME=\"720p60\",AUTOSELECT=YES,DEFAULT=YES\n#EXT-X-STREAM-INF:BANDWIDTH=3422999,RESOLUTION=1280x720,CODECS=\"avc1.4D401F,mp4a.40.2\",VIDEO=\"720p60\",FRAME-RATE=60.000\nhttps://ase11-0.playlist.live-video.net/v1/playlist/CqsFq0LDUkqFq1hAm_NR6H9goC7U_C7stWvHZvCs4VvNHpB8UFMjhWxcBRUTa7K8-I55PqtHAab4NL2fbLNq52I5oJ7lpK8RruXI6JpDOwBeGtHZkL5PmQgC9ZPYuqvqCQ5kBMS65tYo_856Hp9RR8VlqPVgP5RahUYIFBA5WyZKDTFDUgIP_5POukEeNm-VEgt0pipGiewcLBZqev45zO6Trai1YYvdxljAmPCZcxqFE7RRXV3jbKbw7296fN0rSiyPdENhUps6aoDPzB1EflJKxt2uuNy6uavi4uCiEiV90pzTzRd9eP4ZLc5_IJX2Gfk_FCgyeWvPM-yEXqWkK4OHEdB9wAhTTaDE952neOdf82jocno4MOpPYK9MC_NX6OLg0m__u1JheIzh7db_LASgEy2lZKpYj7ZwpVfcFa4bEnts-lnBijCwCEJNjBr4ZUJPTnQiLBqap2gLyrLYDxDEnwSwyEOung6pNg5sXQnj60mG2_2U7u_kvMmtYy0xTtMvD5FDVKyle2UaBSYTIgIFXLaZyOTEM4x8CxUzJNTfhX_jQ7akcpabBk6pwWlCOBSA6juqBEiN02zvPkju6FojQO1fIkIOFhKdC80RnwntjVabzpwShx3BLVVnm9vIkA7bH4bXT1C5msGQULT1vtpjKGCU4x-eEfCiT1D-Xv7TcDh3jz0Evbmda6fTQnlbK8nydG3EWImMbBaTG0gKnqv8PFz-GiZ5pnlGvKlf-93XKtvegSdHAzNXZ_iIprfKXXxSKp2Jpe4ZFbuvrEfIkz9B_H8nCNV5ZCIGV7OO7YmgzswxufnFZBnBaG7l8QRYIxHoTS7QYzyR1lVgV0kFKwtd0GtdT52rgIvtyHl3r1RSUCqAgBt74fPIT89iWJOwF2ZcTotUyla8UizgShkaDE5Ly6VwS8Da3G2t5CABKgl1cy13ZXN0LTIw1gs.m3u8\n#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID=\"480p30\",NAME=\"480p\",AUTOSELECT=YES,DEFAULT=YES\n#EXT-X-STREAM-INF:BANDWIDTH=1427999,RESOLUTION=852x480,CODECS=\"avc1.4D401F,mp4a.40.2\",VIDEO=\"480p30\",FRAME-RATE=30.000\nhttps://ase11-0.playlist.live-video.net/v1/playlist/CqMFfQUpbap3_xDlJ6FPtnCoWKAF6LJDAVTgqrwdtE9-TKAdNSJ2KQvLgdOHq5Ia_CaIStqxLdwZE8jBgJ33DUCFqItX0T-Mm4Nmv8vAnm1tZKP6wy5m977qPhlT3MUd-nXRgntt_LVQZgnlpYFMzXyyysooeODiqQpsaPPAcY41CrTLV8a7VvBlWgBln3cIUTSLpS1EWh39f8uHHhYWECJwzQPMvZzNk8lbEU4Mot6tTg_pg46DProhzrEbHtOoYbEv0yMl18PaOGOQu2-8RFtWih0Td3KiK1P3tpGOwR0YJ5WintAJ5aMPx23rOf7E3WC3DpZbQGVJQY_orjdLpnFK-3a6I3MHqQBltLgVx6hnqWVR_8j71nkjt-pjp6Rjr5ahqs-O3NHw8H0BmIW6bC_QUPKPyVBa-vXRHI6oQaZHA1UIvM24G-wBv2vufiSEobVSfm4ld2UZbR_n9KyZbfcnc_kFRxpvyr70Z9kbh6u0fkayvlbmbj7-w7JtGHHJaF_sTnMJgq1yklL_drYFjGa2PsaJOaeH6WFAx78Cui3NU6-qUNJytC73Y_G-ekm_W_TxXgHp5E8wiEmPu4F4nxU-O06CU7tJqTmUn08oeWBiDAzqnMqsqJd8gnmxJWWpymKz6mWOH56_eiT14by79yX5PNIZkORYHRaUfm_auUGHcCxIw9p235QFH9Q0fY0XDtwFVqPTjKV0-bqW2dRWAjkMkiuMekNaGdkKQePQnwBt3TWnifgakQQ65omxP8Jd6hEycbmA5kL6xl4bjqCJxBJqgwWhC1iVfErFGbLDrob8IQH9LQs4lAgRjozKn1SFA2Vw20L_HcRwDUGsIb2dq8aSJFojw2kgcRIJH1hg5KLCn3rn3tCmeu3suJ_gG5RC1H_MsCXdGgww1TIG_uT6sw3RkscgASoJdXMtd2VzdC0yMNYL.m3u8')
        // }

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
                    options: [], // Akan diisi setelah manifest parsed
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

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // Dapatkan kualitas yang tersedia dari manifest
                    const qualities = [];
                    const qualityLabels = {
                        1080: '1080p60',
                        720: '720p60',
                        480: '480p'
                    };

                    hls.levels.forEach((level) => {
                        const height = level.height;
                        qualities.push({
                            height: height,
                            label: qualityLabels[height] || `${height}p`
                        });
                    });

                    // Update opsi kualitas player
                    player.quality = {
                        default: 720,
                        options: qualities.map(q => q.height),
                        forced: true,
                        onChange: (quality) => {
                            hls.levels.forEach((level, levelIndex) => {
                                if (level.height === quality) {
                                    hls.currentLevel = levelIndex;
                                }
                            });
                        }
                    };

                    // Set kualitas default
                    const defaultQuality = qualities.find(q => q.height === 720);
                    if (defaultQuality) {
                        hls.currentLevel = qualities.indexOf(defaultQuality);
                    }

                    player.play();
                });

                // Handle errors
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                // console.error('Network error, trying to recover...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                // console.error('Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                // console.error('Fatal error, stopping:', data);
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

let isFingerPrintCleared = false;

async function clearFingerprint() {
    try {
        const token = window.location.hash.substring(1);
        if (token && !isFingerPrintCleared) {
            await update(ref(db, `tokens/${token}`), {
                fingerprint: null,
                lastAccess: new Date().toISOString()
            });
            isFingerPrintCleared = true;
            // console.log('Fingerprint berhasil dihapus');
        }
    } catch (error) {
        console.error('Error menghapus fingerprint:', error);
    }
}

function renderLineup(lineup) {
    const lineupGrid = document.getElementById('lineupGrid');
    if (!lineupGrid || !lineup) return;

    lineupGrid.innerHTML = lineup.map(member => `
        <div class="member-card">
            <img 
                src="${member.img}" 
                alt="${member.name}" 
                class="member-image"
                loading="lazy"
                onerror="this.src='/stream/src/images/default-avatar.png'"
            >
            <p class="member-name">${member.name}</p>
        </div>
    `).join('');
}

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
        // Reset flag saat validasi token baru
        isFingerPrintCleared = false;

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

        // Update fingerprint jika belum ada dan belum pernah dihapus
        if (!tokenData.fingerprint && !isFingerPrintCleared) {
            await update(ref(db, `tokens/${token}`), {
                fingerprint,
                lastAccess: new Date().toISOString()
            });
        }

        // Tambahkan event listeners untuk menghapus fingerprint
        window.addEventListener('beforeunload', clearFingerprint);
        window.addEventListener('unload', clearFingerprint);
        
        // Untuk Android WebView dan tab visibility
        let visibilityTimeout;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Tunggu sebentar sebelum menghapus fingerprint
                visibilityTimeout = setTimeout(clearFingerprint, 1000);
            } else if (document.visibilityState === 'visible') {
                // Batalkan penghapusan fingerprint jika tab kembali aktif
                if (visibilityTimeout) {
                    clearTimeout(visibilityTimeout);
                }
                // Jika fingerprint sudah terhapus, daftarkan kembali
                if (isFingerPrintCleared) {
                    validateToken();
                }
            }
        });

        // Untuk handle back button di Android
        window.addEventListener('popstate', clearFingerprint);

        // Lanjutkan dengan kode yang ada
        const showStatus = await checkShowStatus(tokenData.showId);
        if (!showStatus) {
            hideLoadingSpinner();
            hideLoadingOverlay();
            showError('Show tidak ditemukan');
            return;
        }

        document.getElementById('showTitle').textContent = showStatus.showTitle;
        // Tambahkan render lineup
        if (showStatus.lineup) {
            renderLineup(showStatus.lineup);
        }
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

        const decryptedData = decrypt(showStatus.data);
        initStream(decryptedData);
    } catch (error) {
        hideLoadingSpinner();
        hideLoadingOverlay();
        showError(`Error: ${error.message}`);
    }
}

// Event listeners di akhir file
window.addEventListener('DOMContentLoaded', () => {
    validateToken();
});

window.addEventListener('hashchange', () => {
    validateToken();
}); 