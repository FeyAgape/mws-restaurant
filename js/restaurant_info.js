let restaurant;
    map;


document.addEventListener('DOMContentLoaded', (event) => {
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
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
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
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant);
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        callback('No restaurant id in URL', null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant);
        });
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
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
    ul.appendChild(createReviewHTML(review));
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
  date.innerHTML = review.date;
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

addReview = (form, event) => {
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
}, {});