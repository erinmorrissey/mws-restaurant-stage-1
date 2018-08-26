let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

 /**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiZXJpbm1vcnJpc3NleSIsImEiOiJjamxiMmcyaGcxOHBlM3FvOHZpbjF4MWt1In0.V-0OrC9DSEhYsH0VYx6sUg',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}
// window.initMap = () => {
//   fetchRestaurantFromURL((error, restaurant) => {
//     if (error) { // Got an error!
//       console.error(error);
//     } else {
//       self.map = new google.maps.Map(document.getElementById('map'), {
//         zoom: 16,
//         center: restaurant.latlng,
//         scrollwheel: false
//       });
//       fillBreadcrumb();
//       DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
//     }
//   });
// }

/**
 * EVENT LISTENERS
 */
let form = this.document.getElementById('reviews-form');
form.addEventListener("submit", (event) => handleReviewEvent(event));

window.addEventListener('online', (event) => {
  console.log("*** ONLINE ***");
  const reviewData = JSON.parse(localStorage.getItem('review'));
  postReviewData(reviewData, true);
  localStorage.clear();
});

/**
 * Check if online or not
 */
function isOffline() {
  console.log('called isOnline');
  if (!navigator.onLine) {
    console.log("*** OFFLINE ***");
    return true;
  }
  return false;
}

function handleReviewEvent(event) {
  event.preventDefault();

  console.log('EVENT: ', event);

  const id = Number(getParameterByName('id'));
  const name = this.document.getElementById('name').value;
  const rating = Number(this.document.getElementById('rating').value);
  const comment = this.document.getElementById('comment').value;

  console.log("***** FORM STUFF: ", id, name, rating, comment);

  const formData = {
    "restaurant_id": id,
    "name": name,
    "rating": rating,
    "comments": comment
  };

  postReviewData(formData);
}

/**
 * Handle reviews form submission
 */
function postReviewData(formData, offlinePost = false) {
  const url = `http://localhost:1337/reviews/`;

  if (isOffline()) {
    console.log('storing review offline');
    storeReviewOffline(formData);
    return;
  }

  // Default options are marked with *
  return fetch(url, {
      method: "POST",
      // mode: "cors", // no-cors, cors, *same-origin
      // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, same-origin, *omit
      headers: {
          "Content-Type": "application/json; charset=utf-8",
          // "Content-Type": "application/x-www-form-urlencoded",
      },
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(formData), // body data type must match "Content-Type" header
  })
  .then(function(response) {
    document.getElementById('reviews-form').reset();
    return response.json();
  })
  .then(function(data) {
    DBHelper.openDatabase()
      .then(function(db) {
        const tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        store.put(data);
      });
  })
  .then(function() {
    if (!offlinePost) {
      createNewReviewHTML(formData);
    }
  });
}

/**
 * Store review form data in localStorage.
 */
function storeReviewOffline(reviewData) {
  localStorage.setItem('review', JSON.stringify(reviewData));
  console.log("STORED!");
  createNewReviewHTML(reviewData);
  document.getElementById('reviews-form').reset();
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  console.log("fetchRestaurantFromURL called");
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      fetchReviewsFromURL();
      callback(null, restaurant);
      console.log("reached end of fetchRestaurantFromURL and the id is: ", id);
    });
  }
}

/**
 * Get reviews from page URL.
 */
fetchReviewsFromURL = (callback) => {
  console.log("fetchReviewsFromURL called");
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviewsById(id, (error, reviews) => {
      console.log("YAY! reviews: ", reviews);
      self.reviews = reviews;
      if (!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML(reviews);
      console.log("reached end of fetchReviewsFromURL and the id is: ", id);
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = DBHelper.altTagForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

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
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  console.log("fillReviewsHTML was called");
  console.log("REVIEWS: ", reviews);
  const container = document.getElementById('reviews-container');
  // const title = document.createElement('h3');
  // title.innerHTML = 'Reviews';
  // container.appendChild(title);

  if (!reviews || reviews.length === 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.className = 'review-item';

  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'review-name';
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleString();
  date.className = 'review-date';
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'review-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Create HTML for newly submitted review and add it to the webpage.
 */
createNewReviewHTML = (data) => {
  const li = document.createElement('li');
  li.className = 'review-item';

  if (isOffline()) {
    li.className += ' offline';
  }

  const name = document.createElement('p');
  name.innerHTML = data.name;
  name.className = 'review-name';
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date().toLocaleString();
  date.className = 'review-date';
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${data.rating}`;
  rating.className = 'review-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = data.comments;
  li.appendChild(comments);

  const ul = document.getElementById('reviews-list');
  ul.appendChild(li);
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

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
}
