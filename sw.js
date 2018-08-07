const staticCacheName = 'restaurant-v1';

const urlsToCache = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/img/'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(staticCacheName).then( cache => {
            return cache.addAll(urlsToCache);
        }).catch(err => {
        console.log(err);
    }));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
        cacheNames.filter( cacheName => {
            return cacheName.startsWith('restaurant-') && cacheName !== staticCacheName;
        }).map( cacheName => {
            return cache.delete(cacheName);
       });
    }));
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(staticCacheName).then(cache => {
            return cache.match(event.request).then(response => {
                return response || fetch(event.request).then(response => {
                    cache.put(event.request, response.clone());
                    return response;
                })
            })
        }))
});