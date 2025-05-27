const linkContainer = document.querySelector('.leaflet-control-attribution');
if (linkContainer) {
  const leafletLink = linkContainer.querySelector('a[href="https://leafletjs.com"]');
  if (leafletLink) {
    leafletLink.removeAttribute('href');
    leafletLink.style.cursor = 'default';
    leafletLink.addEventListener('click', function(e) {
      e.preventDefault();
    });
  }
}
