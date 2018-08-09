/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337 // Change this to your server port
        return `http://localhost:${port}/`;
    }
     static get RESTAURANTS_STORE() {
        return 'restaurants';
    }
    static get REVIEWS_STORE() {
        return 'reviews';
    }
    static get PENDING_REVIEWS() {
        return 'pending';
    }

    /**
     * Function to set up and return the database!
     */
    static get dB() {
        if (DBHelper._dB) {
            return Promise.resolve(DBHelper._dB);
        }

        // create and return the database!
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open('restaurant-reviews', 2);

            openRequest.onerror = () => reject();

            // run the update if needed
            openRequest.onupgradeneeded = () => {
                const db = openRequest.result,
                    restaurantStore = db.createObjectStore(DBHelper.RESTAURANTS_STORE, {
                        keyPath: 'id'
                    }),
                    reviewStore = db.createObjectStore(DBHelper.REVIEWS_STORE, {
                        keyPath: 'id'
                    }),
                    pendingReviews = db.createObjectStore(DBHelper.PENDING_REVIEWS, {
                        autoIncrement: true
                    });

                restaurantStore.createIndex('id', 'id');
                restaurantStore.createIndex('cuisine', 'cuisine_type');
                restaurantStore.createIndex('neighborhood', 'neighborhood');
                reviewStore.createIndex('restaurant_id', 'restaurant_id');
                pendingReviews.createIndex('restaurant_id', 'restaurant_id');
            };

            // Open and Resolve Requests!
            openRequest.onsuccess = (event) => {
                DBHelper._dB = openRequest.result;
                resolve(DBHelper._dB);
            };
        });
    }

    /**
     * Function to post the data into the database
     */
    static putDataInDb(store, allData) {
        // Get the db
        return DBHelper.dB
            .then((db) => {
                // set transaction and object store
                const transaction = db.transaction(store, 'readwrite'),
                    objStore = transaction.objectStore(store);
                // loop through restaurants
                allData.forEach(data => {
                    // and save them in the database
                    objStore.put(data);
                });
            })
            // catch any errors and log them to the console
            .catch(error => {
                console.log(`Whoops! Couldn't post data: ${store} ${allData}`, error.message);
            });
    }

    /**
     * Function to pull restaurant data from the database
     */
    static getRestaurantsFromDb(id) {
        // get the db
        return DBHelper.dB
            .then((db) => {
                // set transaction and object store
                const transaction = db.transaction(DBHelper.RESTAURANTS_STORE, 'readonly'),
                    objStore = transaction.objectStore(DBHelper.RESTAURANTS_STORE);
                // if there's an id
                if (id) {
                    // return the selected restaurant
                    return objStore.getAll(id);
                } else {
                    // otherwise return them all
                    return objStore.getAll();
                }
            })
            .then(query => new Promise(resolve => {
                query.onsuccess = () => resolve(query.result);
            }))
            // if there's an error, log it to the console!
            .catch(() => {
                console.log(`Whoops! Couldn't return data for restaurant ${id}`);
                return undefined;
            });
    }

    /**
     * Function to pull review data from the database
     */
    static getReviewsFromDb(id) {
        // get the db
        return DBHelper.dB
            .then((db) => {
                // set transaction and object store
                const reviewTransaction = db.transaction(DBHelper.REVIEWS_STORE, 'readonly'),
                    reviewObjStore = reviewTransaction.objectStore(DBHelper.REVIEWS_STORE),
                    reviewIndex = reviewObjStore.index('restaurant_id'),
                    pendingTransaction = db.transaction(DBHelper.PENDING_REVIEWS, 'readonly'),
                    pendingObjStore = pendingTransaction.objectStore(DBHelper.PENDING_REVIEWS),
                    pendingIndex = pendingObjStore.index('restaurant_id');

                return Promise.all(
                [reviewIndex, pendingIndex].map(index => new Promise((resolve) => {

                        const query = id ? index.getAll(id) : index.getAll();
                        query.onsuccess = () => resolve(query.result);
                    }))
                );


            })
            .then(([reviewResult, pendingResult]) => [...reviewResult, ...pendingResult])
            // if there's an error, log it to the console!
            .catch(error => {
                console.log(`Whoops! Couldn't return reviews for restaurant ${id}`, error.message);
            });
    }


 /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback, id = '') {
        // fetch all restaurants with proper error handling.
        let myCallback = callback;
        // grab the restaurant(s) from the database
        DBHelper.getRestaurantsFromDb(id)
            // if there's any there, throw them to the screen
            .then((restaurants) => {
                // check restaurants exist 
                if (restaurants && restaurants.length > 0) {
                    // and throw them back
                    myCallback(null, restaurants);
                    myCallback = () => {};
                }
            })
            // then grab from the url
            .then(() => fetch(`${DBHelper.DATABASE_URL}restaurants/${id}`))
            // parse the response
            .then((response) => response.json())
            // and insert/update the database
            .then((restaurants) => {
                if (!Array.isArray(restaurants)) {
                    restaurants = [restaurants];
                }
                DBHelper.putDataInDb(DBHelper.RESTAURANTS_STORE, restaurants);
                myCallback(null, restaurants);
            })
            // catch any errors and you know the drill. Log it!
            .catch((error) => {
                myCallback(`Whoops! ${error.message}`, null);
            });
    }

    /**
     * Fetch all reviews.
     */
    static fetchReviews(callback, id) {
        let myCallback = callback;
        DBHelper.getReviewsFromDb(id)
            .then((reviews) => {
                if (reviews && reviews.length > 0) {
                    myCallback(reviews);
                    myCallback = () => {};
                }
            })
            .then(() => fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`))
            .then((response) => response.json())
            .then((reviews) => {
                if (!Array.isArray(reviews)) {
                    reviews = [reviews];
                }
                DBHelper.putDataInDb(DBHelper.REVIEWS_STORE, reviews);
                myCallback(reviews);
            })
            .catch((error) => { // Oops!. Got an error from server or with the response
                console.error(`Request failed. ${error.message}`);
                myCallback([]);
            });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch one restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        }, id);
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        }, id);
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}.webp`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
            position: restaurant.latlng,
            title: restaurant.name,
            url: DBHelper.urlForRestaurant(restaurant),
            map: map,
            animation: google.maps.Animation.DROP
        });
        return marker;
    }

    // mark restaurant as favorite
    static setRestaurantAsFavorite(id, isFavorite) {
        let is_fave = isFavorite ? 'true' : false;
        fetch(`${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=${is_fave}`, {
                method: 'PUT'
            })
            .then((response) => response.json())
            .then((restaurant) => {
                DBHelper.putDataInDb(DBHelper.RESTAURANTS_STORE, [restaurant]);
            })
            .catch(error => {
                console.error(`Couldn't change favorite restaurant: ${error.message}`);
            });
    }

    // add the review to 'pending'
    static addReviewToPending(review) {
        return DBHelper.putDataInDb(DBHelper.PENDING_REVIEWS, [review]);
    }

    // push any pending reviews to the server
    static sendReview(data, callback) {
        // https:/developers.google.com/web/updates/2015/12/background-sync
        return DBHelper.addReviewToPending(data)
            .then(() => navigator.serviceWorker.ready)
            .then(reg => reg.sync.register('send-reviews'))
            .catch(error => {
                DBHelper.emptyPending();
                DBHelper.updateServerReviews([data])
                    .then(() => callback());
            })
            .catch(error => console.error(error.message));
    }

    // Push pending reviews to server
    static updateServerReviews(data) {
        return fetch(`${DBHelper.DATABASE_URL}reviews/`, {
                method: 'post',
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(review => {
                DBHelper.putDataInDb(DBHelper.REVIEWS_STORE, [review]);
            });
    }

    // Remove pending reviews
    static emptyPending() {
        return DBHelper.dB
            .then(db => {
                const transaction = db.transaction(DBHelper.PENDING_REVIEWS, 'readwrite'),
                    store = transaction.objectStore(DBHelper.PENDING_REVIEWS);
                return store.clear();
            })
            .then(query => new Promise(resolve => {
                query.onsuccess = () => resolve();
            }))
            .catch(error => console.warn(`Couldn't clear pending reviews: ${error.message}`));
    }
}