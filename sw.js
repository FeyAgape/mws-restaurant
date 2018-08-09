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
<<<<<<< HEAD
        const openRequest = indexedDB.open('restaurant-reviews', 3);
=======
        const openRequest = indexedDB.open('restaurant-reviews', 2);
>>>>>>> 3638104... Add a form to allow users to create their own reviews: In previous versions of the application, users could only read reviews from the database. You will need to add a form that adds new reviews to the database. The form should include the user’s name, the restaurant id, the user’s rating, and whatever comments they have. Submitting the form should update the server when the user is online. Add functionality to defer updates until the user is connected: If the user is not online, the app should notify the user that they are not connected, and save the users' data to submit automatically when re-connected. In this case, the review should be deferred and sent to the server when connection is re-established (but the review should still be visible locally even before it gets to the server.)

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