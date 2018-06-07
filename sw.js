console.log("Hi from sw.js");


self.addEventListener('install', function(event) {
  console.log("INSTALL");

  var staticCacheName = 'restaurants-v1'

  var urlsToCache = [
    '/',
    '/restaurant.html',
    '/data/restaurants.json',
    '/img/',
    '/css/styles.css',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js'
  ];

  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      console.log('caches.open');
      return cache.addAll(urlsToCache);
    })
  );
});


self.addEventListener('activate', function(event) {
  console.log("ACTIVATE");
});


self.addEventListener('fetch', function(event) {
  console.log("FETCH");
  event.respondWith(
    caches.match(event.request).then(function(response) {
      console.log('caches.match');
      if (response) return response;
      return fetch(event.request);
    })
  );
});
