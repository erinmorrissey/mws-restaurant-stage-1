/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * IndexedDB
   */
  static openDatabase() {    
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
    return idb.open('restaurant-DB', 1, function(upgradeDb) {
      upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
      upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // open IndexedDB and get all restaurants, if 'restaurants' db exists
    return DBHelper.openDatabase()
      .then(function(db) {
        return db.transaction('restaurants', 'readonly')
          .objectStore('restaurants')
          .getAll();
      })
      .then(function(data) {
        // if there are results, use them
        if (data.length > 0) {
          callback(null, data);
        } else {
          // otherwise fetch data from the API & store them in db, then use them
          fetch('http://localhost:1337/restaurants')
            .then(response => response.json())
            .then(function(data) {
              DBHelper.openDatabase()
                .then(function(db) {
                  const tx = db.transaction('restaurants', 'readwrite');
                  const store = tx.objectStore('restaurants');
                  data.forEach(function(restaurant) {
                    store.put(restaurant);
                  })
                });
              callback(null, data);
            })
            .catch(error => callback(error, null));
        }
      });
  }

  /**
   * Fetch all reviews.
   */
  static fetchReviews(id, callback) {
    // open IndexedDB and get all reviews, if 'reviews' db exists
    return DBHelper.openDatabase()
      .then(function(db) {
        return db.transaction('reviews', 'readonly')
          .objectStore('reviews')
          .getAll();
      })
      .then(function(data) {
        // if there are results, use them
        if (data.find( restaurant => restaurant.restaurant_id == id )) {
          callback(null, data);
        } else {
          // otherwise fetch data from the API & store them in db, then use them
          fetch('http://localhost:1337/reviews/?restaurant_id=' + id)
            .then(response => response.json())
            .then(function(data) {
              DBHelper.openDatabase()
                .then(function(db) {
                  const tx = db.transaction('reviews', 'readwrite');
                  const store = tx.objectStore('reviews');
                  data.forEach(function(review) {
                    store.put(review);
                  })
                });
              callback(null, data);
            })
            .catch(error => callback(error, null));
        }
      });
  }

  /**
   * Handle updating restaurant is_favorite status.
   */
  static updateFavStatus(id, isFav) {
    const url = `http://localhost:1337/restaurants/${id}/?is_favorite=${isFav}`
    fetch(url, { method: 'PUT' })
      .then(() => {
        this.openDatabase()
          .then(db => {
            const tx = db.transaction('restaurants', 'readwrite');
            const store = tx.objectStore('restaurants');
            store.get(id)
              .then(restaurant => {
                restaurant.is_favorite = isFav;
                store.put(restaurant);
              });
          })
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
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
    });
  }

  /**
   * Fetch a review by its restaurant ID.
   */
  static fetchReviewsById(id, callback) {
    // fetch all reviews with proper error handling.
    DBHelper.fetchReviews(id, (error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        const review = reviews.filter(r => r.restaurant_id == id);
        if (review) { // Got the review
          callback(null, review);
        } else { // Review does not exist in the database
          callback('Review does not exist', null);
        }
      }
    });
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
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
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
        let results = restaurants
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
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
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant image name for image alt tag.
   */
  static altTagForRestaurant(restaurant) {
    return (`${restaurant.name}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  }

}
