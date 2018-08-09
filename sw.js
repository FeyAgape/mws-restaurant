const staticCacheName = 'restaurant-v1';

const urlsToCache = [
    '/',
    '/manifest.json',
    '/index.html',
    '/restaurant.html',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/index.js',
    '/js/restaurant_info.js',
    '/img/1.webp',
    '/img/2.webp',
    '/img/3.webp',
    '/img/4.webp',
    '/img/5.webp',
    '/img/6.webp',
    '/img/7.webp',
    '/img/8.webp',
    '/img/9.webp',
    '/img/undefined.webp',

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