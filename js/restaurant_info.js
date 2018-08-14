let restaurant;
    map;


/*document.addEventListener('DOMContentLoaded', (event) => {
    // add the new review when service worker says so
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data === 'update-reviews') {
                DBHelper.fetchReviews((reviews) => {
                    fillReviewsHTML(reviews);
                }, self.restaurant.id);
            }
        });
    }

    // handle the form stuff
    const reviewForm = document.getElementById('review_form');
    reviewForm.addEventListener('submit', (event) => {
        if (event.preventDefault) {
            event.preventDefault();
        }
        addReview(reviewForm, event);
        return false;
    });

    // open DB, fetch restaurant data and load map if necessary.
    DBHelper.dB.then(() => {
        fetchRestaurantFromURL((error, restaurant) => {
        fillBreadcrumb();
            if (map) {
                initMap();
            }
        });
    });
}); */

/**
 * Initialize Google map, called from HTML.
 */
/*window.initMap = () => {
    if (self.restaurant) {
        try {
            self.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: self.restaurant.latlng,
                scrollwheel: false
            });
        } catch (error) {
            console.warn(`Map Error: ${error}`);
        }
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    } else {
        map = true;
    }
};*/  


if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register("sw.js").then(function(registration){
        document.getElementById('review_form-submit').addEventListener('click', () => {
          
          if(navigator.onLine){
            sendReview();
          }else{
            window.addEventListener('online', sendReview);
          }
        });
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }).catch(function(err){
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
/* register service workers */

sendReview = () => {
  const data = {
    "restaurant_id": window.restaurant.id,
    "name": document.getElementById("review_form-name").value,
    "rating": document.getElementById("review_form-rating").value,
    "comments": document.getElementById("review_form-comments").value
  }
  fetch('http://localhost:1337/reviews/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  .then(function(response) {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    // Read the response as json.
    return response.json();
  })
  .then(function(responseAsJson) {
    console.log(responseAsJson);

    let request = window.indexedDB.open("MyDatabase", Date.now());
    request.onsuccess = (result) => {
      addReview(responseAsJson, result.db);
    }
    
    window.location.reload();
  }).catch(function(error) {
    console.log(error);
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  /**
   * Initialize Google map, called from HTML.
   */
  window.initMap = () => {
    let request = window.indexedDB.open("MyDatabase", 1);

    request.onerror = function(event) {
      console.log("Error connecting to the db");
    };

    request.onupgradeneeded = function(event){
      window.db = event.target.result;
      const objectStore1 = window.db.createObjectStore("restaurants", {keyPath: "id"});
      const objectStore2 = window.db.createObjectStore("reviews", {keyPath: "id"});
    }

    //Once the db is connected
    request.onsuccess = function(event){
      window.db = event.target.result;

      let objectStore = window.db.transaction("restaurants").objectStore("restaurants");
      objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;

        if(cursor){
          if(cursor.value.id == getParameterByName('id')) window.restaurant = cursor.value;

          cursor.continue();
        }else{
          fetchRestaurantFromURL((error, restaurant) => {
            if (error) { // Got an error!
              console.error(error);
            } else {
              self.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: window.restaurant.latlng,
                scrollwheel: false
              });
              fillBreadcrumb();
              DBHelper.mapMarkerForRestaurant(window.restaurant, self.map);
            }
          });
        };
      }

      let objectStore2 = window.db.transaction("reviews").objectStore("reviews");
      objectStore2.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;

        if(cursor){
          if(!window.reviews) window.reviews = [];
          window.reviews.push(cursor.value);
          cursor.continue();
        }
      };
    }
  }
});


/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
    if (window.restaurant) { // restaurant already fetched!
    console.log("Already fetched", window.restaurant)
    fillRestaurantHTML();
    callback(null, restaurant)
    return;
  }

    const id = getParameterByName('id');
    if (!id) { // no id found in URL
       error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      window.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
};


/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant) => {
  if(!restaurant) restaurant = window.restaurant;

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.alt = restaurant.name;
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  const isFavorite = document.getElementById('restaurant-isFavorite');
  isFavorite.checked = restaurant.is_favorite == 'true' ? true : false;
  isFavorite.onchange = () => {
        DBHelper.setRestaurantAsFavorite(restaurant.id, isFavorite.checked);
        updateIsFaveContainer(isFavorite.checked);
    };

  updateIsFaveContainer(isFavorite.checked);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
    DBHelper.fetchReviews(reviews => fillReviewsHTML(reviews), restaurant.id);
};

updateIsFaveContainer = (checked) => {
    const isFaveContainer = document.getElementById('restaurant-isFavorite-container');
    if (checked) {
        isFaveContainer.setAttribute('class', 'isFave');
    } else {
        isFaveContainer.setAttribute('class', 'notFave');

    }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  window.setTimeout(function(){
    const revs = [];
    if(window.reviews){
      const revs = window.reviews.filter(rev => {
        return rev.restaurant_id == window.restaurant.id;
      });
    }

    if(revs && revs.length > 0){
      console.log("dfafsdfsdfsdf", reviews);
      _fillReviewsHTML()
    }else{
      console.log("NO");
      fetch('http://localhost:1337/reviews/?restaurant_id='+window.restaurant.id).then(function(res){
        if (res.status === 200) { // Got a success response from server!
          return res.json();
        }
      }).then(function(reviews){
        window.reviews = reviews;
  
        for(let review in reviews){
          addReview(window.reviews[review], window.db);
        }

        _fillReviewsHTML()
      });
    }
  }, 300);
}

_fillReviewsHTML = () => {
  const reviews = window.reviews;

  console.log(reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
   console.log(review.restaurant_id,"and",window.restaurant.id);
    if(review.restaurant_id  == window.restaurant.id) ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const createdAt = new Date(review.createdAt);
  date.innerHTML = createdAt.getDate()+"/"+createdAt.getMonth()+"/"+createdAt.getFullYear();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

// Connection Status
function isOnline() {
  var connectionStatus = document.getElementById('connectionStatus');

  if (!navigator.onLine){
    document.getElementById('connectionStatus').style.display = 'block';
  }else{
    document.getElementById('connectionStatus').style.display = 'none';
  }
}
window.addEventListener('online', isOnline);
window.addEventListener('offline', isOnline);
isOnline();

/*** IndexedDB ***/
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

  if(!window.indexedDB){
    console.log("This browser doesn't support IndexedDB");
  }

  function add2DB(restaurant, db){
    window.request = db.transaction(["restaurants"], "readwrite")
      .objectStore("restaurants")
      .add(restaurant);

    window.request.onsuccess = function(event) {
      console.log("The restaurant has been added to the db");
    };

    window.request.onerror = function(event) {
      console.log("Unable to add to the db");
    }
  }

  function addReview(review, db){
    console.log("Review added");
    window.request = db.transaction(["reviews"], "readwrite")
      .objectStore("reviews")
      .add(review);

    window.request.onsuccess = function(event) {
      console.log("The review has been added to the db");
    };

    window.request.onerror = function(event) {
      console.log("Unable to add to the db");
    }
  }
/*addReview = (form, event) => {
    // get data from form
    const formData = formToJSON(form.elements);
    Object.assign(formData, {
        restaurant_id: self.restaurant.id
    });

    // add review straight to screen
    const reviewListElement = createReviewHTML(formData),
        list = document.getElementById('reviews-list');
    list.append(reviewListElement);

    // then chuck it at the server
    DBHelper.sendReview(formData, () => DBHelper.fetchReviews((reviews) => fillReviewsHTML(reviews), self.restaurant.id));
};

// https://code.lengstorf.com/get-form-values-as-json/
formToJSON = elements => [].reduce.call(elements, (data, element) => {
    if (element.name != '') {
        data[element.name] = element.value;
    }
    return data;
}, {});*/
