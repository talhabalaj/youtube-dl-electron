const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { giveMeSeconds } = require("../front/js/helpers");

const videoFile = path.join(__dirname, "W8MjnsJ820E.video");
const audioFile = path.join(__dirname, "W8MjnsJ820E.audio");

// // ffmpeg.setFfmpegPath(require("ffmpeg-static-electron").path);
// ffmpeg.setFfmpegPath("c:\\path\\ffmpeg.exe");
// ffmpeg.setFfprobePath(require("ffprobe-static-electron").path);

// const getDuration = audioFile =>
//   new Promise((res, rej) => {
//     ffmpeg.ffprobe(audioFile, (err, metadata) => {
//       if (err) return rej(err);
//       console.log(metadata.format.duration);
//       res(metadata.format.duration);
//     });
//   });

// const encode = (videoFile, audioFile, duration) =>
//   new Promise((rs, rj) => {
//     ffmpeg()
//       .addInput(videoFile)
//       .videoCodec("copy")
//       .addInput(audioFile)
//       .audioCodec("copy")
//       .on("start", cmd => {
//         console.log(`Started ${cmd}`);
//       })
//       .on("end", e => {
//         console.log("end");
//         // fs.unlinkSync(audioFile);
//         // fs.unlinkSync(videoFile);
//         rs(e);
//       })
//       .on("progress", progress => {
//         console.log((giveMeSeconds(progress.timemark) / duration) * 100);
//       })
//       .on("error", error => {
//         console.log(error);
//       })
//       .output("test.mkv")
//       .run();
//   });

// getDuration(audioFile).then(duration => {
//   encode(videoFile, audioFile, duration)
//     .then(() => {
//       console.log("end");
//     })
//     .catch(err => {
//       console.log(err);
//     });
// });

const requiredFormat = {};
requiredFormat.container = "mkv";

const verifyFileExt = filePath => {
  const ext = path.extname(path.basename(filePath));
  if (ext !== requiredFormat.container) {
    return `${path.basename(filePath, ext)}.${requiredFormat.container}`;
  }
};

console.log(verifyFileExt("filepath.mp4"));
