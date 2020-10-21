module.exports = [
  {
    id: 1,
    name: "4K (2160p) UHD",
    videoFormatTag: 313,
    audioFormatTag: 251,
    type: "both",
    container: "mkv",
    encodingRequired: true
  },
  {
    id: 2,
    name: "1440p QHD",
    videoFormatTag: 271,
    audioFormatTag: 251,
    type: "both",
    container: "mkv",
    encodingRequired: true
  },
  {
    id: 3,
    name: "1080p FHD",
    videoFormatTag: 137,
    audioFormatTag: 251,
    type: "both",
    container: "mkv",
    encodingRequired: true
  },
  {
    id: 4,
    name: "720p HD (mp4)",
    videoFormatTag: 22,
    audioFormatTag: 22,
    type: "both",
    container: "mp4",
    encodingRequired: true
  },
  {
    id: 10,
    name: "720p HD (mkv)",
    videoFormatTag: 136,
    audioFormatTag: 251,
    type: "both",
    container: "mp4",
    encodingRequired: true
  },
  {
    id: 5,
    name: "480p SD",
    videoFormatTag: 244,
    audioFormatTag: 251,
    type: "both",
    container: "mkv",
    encodingRequired: false
  },
  {
    id: 6,
    name: "360p LD",
    videoFormatTag: 18,
    audioFormatTag: 18,
    type: "both",
    container: "mp4",
    encodingRequired: false
  },
  {
    id: 7,
    name: "240p",
    videoFormatTag: 36,
    audioFormatTag: 36,
    type: "both",
    container: "3pg",
    encodingRequired: false
  },
  {
    id: 8,
    name: "144p",
    videoFormatTag: 17,
    audioFormatTag: 17,
    type: "both",
    container: "3pg",
    encodingRequired: false
  },
  {
    id: 9,
    name: "Best (audio only)",
    videoFormatTag: null,
    audioFormatTag: 251,
    type: "audio",
    container: "webm",
    encodingRequired: false
  }
];
