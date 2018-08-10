const staticCacheName = 'restaurant-v0'
      DATABASE_URL = 'http://localhost:1337/',
      REVIEW_STORE = 'reviews',
      PENDING_REVIEWS = 'pending'
let   _dB;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(staticCacheName).then( cache => {
            return cache.addAll([
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
    '/img/undefined.webp'
  ]);
        })
        );
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

// grab the database so we can updated it
dB = () => {
    if (_dB) {
        return Promise.resolve(_dB);
    }

    return new Promise((resolve, reject) => {

        const openRequest = indexedDB.open('restaurant-reviews', 3);

        openRequest.onerror = () => reject();

        openRequest.onsuccess = (event) => {
            _dB = openRequest.result;
            resolve(_dB);
        };
    });
};


//Using Background Sync by Jake Archibald https://developers.google.com/web/updates/2015/12/background-sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'send-reviews') {
        event.waitUntil(
            getPendingReviews()
            .then((messages) => {
                return Promise.all(messages.map((message) => updateServerReviews(message)));
            })
            .then(() => emptyPending())
            .then(() => {
                this.clients.matchAll().then((clients) => {
                    clients.forEach(client => client.postMessage('update-reviews'));
                });
            })
        );
    }
});


// Save the pending reviews
getPendingReviews = () => {
    return dB()
        .then(db => {
            const transaction = db.transaction(PENDING_REVIEWS, 'readonly'),
                store = transaction.objectStore(PENDING_REVIEWS);
            return store.getAll();
        })
        .then(query => new Promise((resolve) => {
            query.onsuccess = () => resolve(query.result);
        }))
        .catch(error => {
            console.warn(`Couldn't get the pending reviews`, error.message);
            return [];
        });
};

// Push the pending reviews to the server
updateServerReviews = (data) => {
    return fetch(`${DATABASE_URL}reviews/`, {
            method: 'post',
            body: JSON.stringify(data)
        })
        .then((response) => response.json())
        .then((review) => {
            putDataInDb(REVIEW_STORE, [review]);
        });
};

// Clear the pending reviews
emptyPending = () => {
    return dB()
        .then((db) => {
            const transaction = db.transaction(PENDING_REVIEWS, 'readwrite');
            const store = transaction.objectStore(PENDING_REVIEWS);
            return store.clear();
        })
        .then((query) => new Promise((resolve) => {
            query.onsuccess = () => resolve();
        }))
        .catch(error => {
            console.warn(`Couldn't clear the pending reviews`, error.message);
            return [];
        });
};

// Update the database with the reviews
putDataInDb = (storeName, reviews) => {
    return dB()
        .then((db) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            reviews.forEach((review) => {
                store.put(review);
            });
        })
        .catch(error => {
            console.warn(`Couldn't set ${data} for ${storeName}.`, error.message);
            return [];
        });
};