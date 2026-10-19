/* Videos de YouTube: se cargan solo al pulsar (privacidad y rendimiento) */
(function () {
  document.querySelectorAll('.yt').forEach(function (b) {
    b.addEventListener('click', function () {
      var src = b.dataset.list
        ? 'https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(b.dataset.list) + '&autoplay=1'
        : 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.id) + '?autoplay=1';
      var f = document.createElement('iframe');
      f.src = src; f.title = b.dataset.title || 'YouTube'; f.loading = 'lazy'; f.allowFullscreen = true;
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      b.replaceWith(f);
    });
  });
})();
