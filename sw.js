var staticCacheName = 'restaurant-v1.0';
var staticImageCacheName = 'restaurant-imgs';
var allCaches = [
    staticCacheName,
    staticImageCacheName
];
var urlsToCache = [
    '/',
    '/css/styles.css',
    '/index.html',
    '/restaurant.html',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/data/restaurants.json'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.open(staticCacheName).then(function (cache) {
            return cache.match(event.request).then(function (response) {
                return response || fetch(event.request).then(function (response) {
                    cache.put(event.request, response.clone());
                    return response;
                })
            })
        }))
});