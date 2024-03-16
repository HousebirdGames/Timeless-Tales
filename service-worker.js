var CACHE_VERSION = 'v=2.0.6';

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(function (cache) {
            cache.addAll([
                '/timeless-tales/manifest.json?v=2.0.6',
                '/timeless-tales/index.html?v=2.0.6',
                '/timeless-tales/style-modern.css?v=2.0.6',
                '/timeless-tales/style-retro.css?v=2.0.6',
                '/timeless-tales/style.css?v=2.0.6',
                '/timeless-tales/src/main.js?v=2.0.6',
                '/timeless-tales/src/patchNotes.js?v=2.0.6',
                '/timeless-tales/ten-cards/index.html?v=2.0.6',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-Bold.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-BoldItalic.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-Italic.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-Light.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-LightItalic.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-Medium.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-MediumItalic.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-Regular.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-SemiBold.ttf',
                '/timeless-tales/fonts/Quicksand/quicksand-v30-latin-ext_latin-700.ttf',
                '/timeless-tales/fonts/CormoranInfant/CormorantInfant-SemiBoldItalic.ttf',
                '/timeless-tales/fonts/Quicksand/quicksand-v30-latin-ext_latin-regular.ttf',
                '/timeless-tales/fonts/VT323/VT323-Regular.ttf',
                '/timeless-tales/src/modules/cards.js?v=2.0.6',
                '/timeless-tales/src/modules/combat.js?v=2.0.6',
                '/timeless-tales/src/modules/game.js?v=2.0.6',
                '/timeless-tales/src/modules/enemyGeneration.js?v=2.0.6',
                '/timeless-tales/src/modules/gameData.js?v=2.0.6',
                '/timeless-tales/src/modules/gameState.js?v=2.0.6',
                '/timeless-tales/src/modules/gameUI.js?v=2.0.6',
                '/timeless-tales/src/modules/itemGeneration.js?v=2.0.6',
                '/timeless-tales/src/modules/popupManager.js?v=2.0.6',
                '/timeless-tales/src/modules/sceneGeneration.js?v=2.0.6',
            ]);
        }).then(() => self.skipWaiting())
    );
});

function cacheImages(directory, fileExtension) {
    self.addEventListener('install', function (event) {
        event.waitUntil(
            caches.open(CACHE_VERSION).then(function (cache) {
                return fetch(directory + '/*.' + fileExtension + '?' + CACHE_VERSION)
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('Failed to fetch images');
                        }
                        return response;
                    })
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (fileUrls) {
                        return cache.addAll(fileUrls);
                    });
            }).then(() => self.skipWaiting())
        );
    });
}

cacheImages('/timeless-tales/img', 'png');
cacheImages('/timeless-tales/img', 'jpg');
cacheImages('/timeless-tales/img/enemies', 'jpg');
cacheImages('/timeless-tales/img/locations', 'jpg');

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (CACHE_VERSION !== cacheName) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }),
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
            });
        }),
        self.clients.claim()
    );
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    var urlWithoutQuery = request.url;

    if (urlWithoutQuery.endsWith('/')) {
        urlWithoutQuery += 'index.html?v=2.0.6';
    }

    var updatedRequest = new Request(urlWithoutQuery, {
        method: request.method,
        headers: request.headers,
        mode: 'cors',
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
        integrity: request.integrity
    });

    if (urlWithoutQuery.includes('index.html')) {
        event.respondWith(
            fetch(updatedRequest).catch(() => {
                return caches.match(updatedRequest);
            })
        );
    } else {
        event.respondWith(
            caches.match(updatedRequest, { ignoreSearch: false })
                .then(function (response) {
                    if (response) {
                        return response;
                    }

                    if (request.url.includes('manifest.json')) {
                        return fetch(request)
                            .then(response => {
                                if (!response || response.status !== 200) {
                                    console.error('Failed to fetch manifest.json');
                                    throw new Error('Failed to fetch manifest.json');
                                }
                                return response;
                            })
                            .catch(error => {
                                console.error('Fetch failed for manifest.json', error);
                                throw error;
                            });
                    }

                    var fetchRequest = request.clone();

                    return fetch(fetchRequest).then(
                        function (response) {
                            if (!response || response.status !== 200) {
                                return response;
                            }

                            var responseToCache = response.clone();

                            caches.open(CACHE_VERSION)
                                .then(function (cache) {
                                    cache.put(updatedRequest, responseToCache);
                                });

                            return response;
                        }
                    ).catch(function () {
                        return caches.match('/timeless-tales/offline.html?v=2.0.6')
                            .catch(() => new Response('Offline and the offline page is not available'));
                    });
                })
        );
    }
});