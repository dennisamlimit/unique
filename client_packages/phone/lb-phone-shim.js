(function() {
    // Sofortige Meldung beim Laden
    if (window.mp) {
        mp.trigger("phone:clientLog", "--- CEF SHIM INITIALISIERT ---");
    }

    window.GetParentResourceName = () => "lb-phone";

    const originalFetch = window.fetch;
    const fetchCallbacks = new Map();
    let requestId = 0;

    const logToServer = (type, ...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (window.mp) mp.trigger("phone:clientLog", `[CEF:${type}] ${msg}`);
    };

    console.log = (...args) => logToServer('LOG', ...args);
    console.error = (...args) => logToServer('ERROR', ...args);
    console.warn = (...args) => logToServer('WARN', ...args);

    window.fetch = function(url, options) {
        const urlStr = String(url);
        
        // Wir fangen ALLES ab was nach lb-phone oder NUI aussieht
        if (urlStr.includes('lb-phone') || urlStr.includes('nui://') || urlStr.includes('nui-res')) {
            const endpoint = urlStr.includes('lb-phone/') ? urlStr.split('lb-phone/')[1] : 
                            (urlStr.includes('/') ? urlStr.split('/').pop() : urlStr);
            
            console.log(`Abgefangener Request: ${endpoint}`);
            
            let body = {};
            try {
                if (options?.body) {
                    body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                }
            } catch (e) {}

            const currentId = requestId++;
            return new Promise((resolve) => {
                fetchCallbacks.set(currentId, (data) => {
                    resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve(data),
                        text: () => Promise.resolve(JSON.stringify(data)),
                        blob: () => Promise.resolve(new Blob([JSON.stringify(data)]))
                    });
                });
                if (window.mp) mp.trigger("phone:nuiRequest", endpoint, JSON.stringify(body), currentId);
            });
        }
        return originalFetch(url, options);
    };

    window.onPhoneCallback = (id, data) => {
        const callback = fetchCallbacks.get(parseInt(id));
        if (callback) {
            callback(data);
            fetchCallbacks.delete(parseInt(id));
        }
    };

    window.sendPhoneEvent = (type, data) => {
        // Handhabung von Sichtbarkeit
        if (type === 'openPhone') {
            const root = document.getElementById('root');
            if (root) {
                root.style.display = 'block';
                root.style.visibility = 'visible';
                root.style.pointerEvents = 'all';
            }
        } else if (type === 'closePhone') {
            const root = document.getElementById('root');
            if (root) {
                root.style.display = 'none';
                root.style.visibility = 'hidden';
                root.style.pointerEvents = 'none';
            }
        }

        window.postMessage({ type, data }, "*");
    };

    // Initial verstecken
    window.addEventListener('load', () => {
        const root = document.getElementById('root');
        if (root) {
            root.style.display = 'none';
        }
        console.log("Root initial versteckt.");
    });

    console.log("Bridge vollständig einsatzbereit.");
    window.__lbPhoneReady = true;
})();




