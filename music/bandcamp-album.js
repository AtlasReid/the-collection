// Public metadata from the artist's official Bandcamp album page.
// Checked 8 November 2026: https://davemilligan.bandcamp.com/album/momento
// Album/track IDs, order and durations come from its public data-tralbum;
// durations are floored to whole seconds to match the native widget. No audio or stream URLs are stored.
// Official artwork: https://f4.bcbits.com/img/a1180656229_5.jpg (700 × 700).
// The album page marks the music/artwork all rights reserved.
export const bandcampAlbum = {
  id: 'momento',
  title: 'Momento',
  artist: 'Dave Milligan',
  year: 2020,
  releaseDate: '2020-08-28',
  genre: 'Jazz',
  cover: './assets/covers/momento.jpg',
  palette: ['#203f58', '#f3f1e9'],
  bandcampURL: 'https://davemilligan.bandcamp.com/album/momento',
  bandcampAlbumId: 1731559922,
  sourceTrackCount: 7,
  metadataComplete: true,
  tracks: [
    {id:'momento-bc-908352832',title:'Going Nowhere',duration:348,bandcampTrackId:908352832,bandcampURL:'https://davemilligan.bandcamp.com/track/going-nowhere'},
    {id:'momento-bc-4015102488',title:'Parcel of Rogues',duration:312,bandcampTrackId:4015102488,bandcampURL:'https://davemilligan.bandcamp.com/track/parcel-of-rogues'},
    {id:'momento-bc-3674852658',title:"(There's) Always Tomorrow",duration:416,bandcampTrackId:3674852658,bandcampURL:'https://davemilligan.bandcamp.com/track/theres-always-tomorrow'},
    {id:'momento-bc-2299711662',title:'They Said It Was About You',duration:417,bandcampTrackId:2299711662,bandcampURL:'https://davemilligan.bandcamp.com/track/they-said-it-was-about-you'},
    {id:'momento-bc-4286034820',title:'Freedom',duration:365,bandcampTrackId:4286034820,bandcampURL:'https://davemilligan.bandcamp.com/track/freedom'},
    {id:'momento-bc-27822153',title:"Sandy's 70th",duration:269,bandcampTrackId:27822153,bandcampURL:'https://davemilligan.bandcamp.com/track/sandys-70th'},
    {id:'momento-bc-4246462613',title:'Made In The Border',duration:394,bandcampTrackId:4246462613,bandcampURL:'https://davemilligan.bandcamp.com/track/made-in-the-border'},
  ],
};
