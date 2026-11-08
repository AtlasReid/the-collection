import { bandcampAlbum } from './bandcamp-album.js';
import { portraitsSoundCloudAlbum } from './soundcloud-portraits-album.js';
import { stillAsYourSleepingBandcampAlbum } from './bandcamp-still-as-your-sleeping-album.js';
import { frierenSoundCloudAlbum } from './soundcloud-frieren-album.js';
import { withoutFearSoundCloudAlbum } from './soundcloud-without-fear-album.js';
import { sonderSoundCloudAlbum } from './soundcloud-sonder-album.js';
import { scottishBagpipeAlbum } from './scottish-bagpipe-album.js';
import { soundcloudAlbum } from './soundcloud-album.js';
import { dermotSoundCloudAlbum } from './soundcloud-dermot-album.js';

// One requested collection for the 3D desk, desktop preview and CSS fallback.
// Keep the established real-album IDs stable so saved imports remain usable.
// The earlier invented records remain in collection.js as historical fixtures;
// they are not part of this visible collection.
export const collectionAlbums = [
  bandcampAlbum,
  portraitsSoundCloudAlbum,
  stillAsYourSleepingBandcampAlbum,
  frierenSoundCloudAlbum,
  withoutFearSoundCloudAlbum,
  sonderSoundCloudAlbum,
  scottishBagpipeAlbum,
  soundcloudAlbum,
  dermotSoundCloudAlbum,
];
