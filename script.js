'use strict';
const data = window.ALBUMS || {1:[],2:[],3:[]};
const names = ['Album 1','Album 2','Album 3'];
const formatCount = count => count + (count === 1 ? " item" : " items");
const albums = document.getElementById('albums');
const gallery = document.getElementById('gallery');
const photos = document.getElementById('photos');
const viewer = document.getElementById('viewer');
let current = [], active = 0;
const movie = document.getElementById('movie');
const large = document.getElementById('large');
const viewerSpinner = document.createElement('span');
viewerSpinner.className = 'loading-spinner viewer-spinner';
viewerSpinner.setAttribute('role', 'status');
viewerSpinner.setAttribute('aria-label', 'Loading photo');
viewerSpinner.hidden = true;
large.before(viewerSpinner);
let viewerRender = 0;
const isVideo = src => /\.(mp4|webm|ogv|m4v)$/i.test(src);
function preview(src, label) {
 const thumbnailSrc = 'thumbs/' + src + '.jpg';
 if (!isVideo(src)) {
   const image = imageElement(thumbnailSrc, label);
   image.addEventListener('error', () => { image.src = src; }, {once: true});
   return image;
 }
 const thumbnail = document.createElement('span');
 thumbnail.className = 'video-preview';
 thumbnail.setAttribute('aria-hidden', 'true');

 const frame = imageElement(thumbnailSrc, '');
 frame.addEventListener('error', () => { frame.hidden = true; }, {once: true});

 const badge = document.createElement('span');
 badge.className = 'video-badge';
 badge.textContent = '▶ Video';
 thumbnail.append(frame, badge);
 return thumbnail;
}
function stopMovie() {
 movie.pause();
 movie.removeAttribute('src');
 movie.load();
}
viewer.addEventListener('close', () => {
 viewerRender++;
 viewerSpinner.hidden = true;
 stopMovie();
});
function imageElement(src, alt) { const img = new Image(); img.src = src; img.alt = alt; return img; }
for (let id=1; id<=3; id++) {
 const files = data[id] || [];
 const card = document.createElement('button'); card.className='album';
 if(files.length){const img=preview(files.find(src => !isVideo(src)) || files[0], ''); img.classList.add('cover');card.append(img);}
 const number=document.createElement('span');number.className='number';number.textContent='ALBUM / 0'+id;
 const bottom=document.createElement('div');bottom.className='album-bottom';
 const info=document.createElement('div');const title=document.createElement('h2');title.textContent=names[id-1];
 const count=document.createElement('p');count.textContent=formatCount(files.length);info.append(title,count);
 const arrow=document.createElement('span');arrow.className='round';arrow.textContent='↗';bottom.append(info,arrow);card.append(number,bottom);
 card.addEventListener('click', () => {
   history.pushState({galleryAlbum: id}, '');
   openAlbum(id);
 });
 albums.append(card);
}
const batchSize = 20;
let loading = false;
const back = document.getElementById('back');
const loadStatus = document.createElement('p');
loadStatus.className = 'loading-spinner';
loadStatus.setAttribute('role', 'status');
loadStatus.hidden = true;
loadStatus.setAttribute('aria-label', 'Loading');
photos.after(loadStatus);

function waitForPreview(thumbnail) {
 const media = thumbnail instanceof HTMLImageElement ? thumbnail : thumbnail.querySelector('img');
 if (media.complete) return Promise.resolve();

 return new Promise(resolve => {
   const readyEvent = 'load';
   const timeout = setTimeout(finish, 15000);
   function finish() {
     clearTimeout(timeout);
     media.removeEventListener(readyEvent, finish);
     media.removeEventListener('error', finish);
     resolve();
   }
   media.addEventListener(readyEvent, finish);
   media.addEventListener('error', finish);
 });
}
let shown = 0;
let albumRender = 0;
const loadMarker = document.createElement('div');
loadMarker.style.height = '1px';
loadMarker.setAttribute('aria-hidden', 'true');
photos.after(loadMarker);
const loadObserver = new IntersectionObserver(entries => {
 if (!loading && !gallery.hidden && entries.some(entry => entry.isIntersecting)) appendBatch();
}, {rootMargin: '0px 0px 150px 0px'});

async function appendBatch() {
 if (loading || shown >= current.length) {
   loadMarker.hidden = true;
   return;
 }
 const renderId = albumRender;
 loading = true;
 loadStatus.hidden = false;
 photos.inert = true;
 back.disabled = true;
 loadObserver.unobserve(loadMarker);
 const end = Math.min(shown + batchSize, current.length);
 const batch = document.createDocumentFragment();
 const previews = [];
 for (let i = shown; i < end; i++) {
   const src = current[i];
   const video = isVideo(src);
   const button = document.createElement('button');
   button.className = 'photo';
   button.setAttribute('aria-label', (video ? 'View video ' : 'View photo ') + (i + 1));
   const thumbnail = preview(src, 'Photo ' + (i + 1));
   if (!video) {
     thumbnail.decoding = 'async';
   }
   button.append(thumbnail);
   button.onclick = () => {
     active = i;
     render();
     viewer.showModal();
   };
   previews.push(waitForPreview(thumbnail));
   batch.append(button);
 }
 await Promise.all(previews);
 if (renderId !== albumRender) return;
 photos.append(batch);
 loading = false;
 loadStatus.hidden = true;
 photos.inert = false;
 back.disabled = false;
 shown = end;
 loadMarker.hidden = shown >= current.length;
 if (!loadMarker.hidden) requestAnimationFrame(() => {
   if (renderId === albumRender && !gallery.hidden && !loadMarker.hidden) loadObserver.observe(loadMarker);
 });
}

function resetAlbum() {
 albumRender++;
 loadObserver.disconnect();
 loadMarker.hidden = true;
 loading = false;
 loadStatus.hidden = true;
 photos.inert = false;
 back.disabled = false;
 photos.replaceChildren();
 if (viewer.open) viewer.close();
}

function openAlbum(id){
 resetAlbum();
 current=data[id]||[];albums.hidden=true;gallery.hidden=false;
 document.getElementById('gallery-title').textContent=names[id-1];document.getElementById('count').textContent=formatCount(current.length);
 document.getElementById('empty').hidden=current.length>0;
 shown = 0;
 appendBatch();
 window.scrollTo({top:0,behavior:'instant'});
}
function render(){const src=current[active];const video = isVideo(src);
 stopMovie();
 movie.hidden = !video;
 const renderId = ++viewerRender;
 large.hidden = true;
 viewerSpinner.hidden = video;
 if (video) {
   large.removeAttribute('src');
   movie.src = src;
 } else {
   large.src = src;
   large.alt = 'Photo '+(active+1);
   const showPhoto = () => {
     if (renderId !== viewerRender) return;
     viewerSpinner.hidden = true;
     large.hidden = false;
   };
   large.decode().then(showPhoto, showPhoto);
 }document.getElementById('position').textContent=(active+1)+' / '+shown;document.getElementById('caption').textContent=decodeURIComponent(src.split('/').pop());document.getElementById('prev').hidden = active === 0;
 document.getElementById('next').hidden = active >= shown - 1;}
function step(direction) {
 const nextIndex = active + direction;
 if (nextIndex < 0 || nextIndex >= shown) return;
 active = nextIndex;
 render();
}
function restoreAlbum(state) {
 const id = state?.galleryAlbum;
 if (Number.isInteger(id) && id >= 1 && id <= names.length) {
   openAlbum(id);
   return;
 }
 resetAlbum();
 gallery.hidden = true;
 albums.hidden = false;
}
back.onclick = () => history.back();
window.addEventListener('popstate', event => restoreAlbum(event.state));
 document.getElementById('close').onclick=()=>viewer.close();
 document.getElementById('prev').onclick=()=>step(-1);document.getElementById('next').onclick=()=>step(1);
 document.addEventListener('keydown',e=>{if(!viewer.open || e.target === movie)return;if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);});
 let touchX=null;viewer.addEventListener('touchstart',e=>{touchX=e.target === movie ? null : e.changedTouches[0].screenX;},{passive:true});viewer.addEventListener('touchend',e=>{if(touchX===null)return;const delta=e.changedTouches[0].screenX-touchX;if(Math.abs(delta)>60)step(delta<0?1:-1);touchX=null;},{passive:true});


restoreAlbum(history.state);
