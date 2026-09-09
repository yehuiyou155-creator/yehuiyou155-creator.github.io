/* 宿舍减脂记录工具 Service Worker
 * 导航请求 network-first（保证更新即时可见），静态资源 stale-while-revalidate。
 * 缓存命名 df-vN：改 index.html 时若静态资源也变了，请把 vN 升一位。 */
var CACHE = "df-v4";
var ASSETS = [
  "./",
  "./index.html",
  "./dorm-fatloss.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  /* 页面导航：先网络，断网回退缓存 */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html", { ignoreSearch: true });
      })
    );
    return;
  }

  /* 其余静态资源：缓存优先，后台静默更新 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
