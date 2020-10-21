const ytdl = require("ytdl-core");
const os = require("os");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const DownloadPresets = require("./downloadPresets");
const { giveMeSeconds, getInfo } = require("../helpers");

let id = 0;

ffmpeg.setFfmpegPath(require("ffmpeg-static-electron").path);
ffmpeg.setFfprobePath(require("ffprobe-static-electron").path);

class QueueItem extends Object {
  constructor({ VideoId, Downloader }) {
    super();
    this.id = id++;

    this.VideoId = VideoId;
    this.VideoInfo = null;

    this.Status = "getting-metadata";
    this.DownloaderInfo = {};

    this.Error = null;
    this.DownloadInfo = null;

    this._DownloadInfo = null;
    this._Downloader = Downloader;
    this.ProgressHandlerTimeout;
    this.CurrentFormatId = null;
    this.CurrentFormatName = null;
    this.willEncode = false;
    this.EncodingProgress = null;
    this.progressHandler();
  }

  UpdateStatus(Status) {
    this.Status = Status;
  }

  ParseVideo() {
    if (this.DownloadInfo != null)
      return new Promise((rs, rj) => rs(this.DownloadInfo));
    // const url = `https://youtube.com/watch?v=${this.VideoId}`;
    return new Promise((rs, rj) => {
      ytdl
      .getInfo(this.VideoId)
        .then(info => {
          this.VideoInfo = {
            title: info.title,
            videoUrl: info.video_url,
            videoId: info.video_id
          };
          this._DownloadInfo = info.formats;
          this._filterFormats();
          rs({ formats: this.DownloadInfo, info: this.VideoInfo });
        })
        .catch(err => rj(err));
    });
  }

  _filterFormats() {
    this.DownloadInfo = [];
    const formatItags = this._DownloadInfo.map(d => parseInt(d.itag));
    for (const DownloadPreset of DownloadPresets) {
      // Formats
      let requiredFormats = [];

      // Helper functions
      const isAvailable = itag => formatItags.includes(itag);
      const isAudio = DownloadPreset.type !== "both";
      const isCombined =
        DownloadPreset.audioFormatTag === DownloadPreset.videoFormatTag;
      const returnFormat = itag =>
        this._DownloadInfo.find(d => d.itag === itag.toString());
      let willEncode = false;
      if (isAudio && isAvailable(DownloadPreset.audioFormatTag)) {
        requiredFormats = {
          audio: returnFormat(DownloadPreset.audioFormatTag)
        };
      } else if (isCombined && isAvailable(DownloadPreset.videoFormatTag)) {
        requiredFormats = {
          video: returnFormat(DownloadPreset.videoFormatTag)
        };
      } else if (
        isAvailable(DownloadPreset.videoFormatTag) &&
        isAvailable(DownloadPreset.audioFormatTag)
      ) {
        requiredFormats = {
          video: returnFormat(DownloadPreset.videoFormatTag),
          audio: returnFormat(DownloadPreset.audioFormatTag)
        };
        willEncode = true;
      } else {
        continue;
      }

      const formatDetails = {};

      for (const [key, format] of Object.entries(requiredFormats)) {
        formatDetails[key] = {};
        formatDetails[key].url = format.url;
        formatDetails[key].container = format.container;
      }

      const availablePreset = {
        ...DownloadPreset,
        formatDetails,
        willEncode
      };

      this.DownloadInfo.push(availablePreset);
    }
  }

  Download(id, FilePath) {
    const requiredFormat = this.DownloadInfo.find(d => d.id === id);
    const { formatDetails, willEncode } = requiredFormat;

    const verifyFileExt = filePath => {
      const ext = path.extname(path.basename(filePath));
      const directory = path.dirname(filePath);
      const pathWithoutExt = path.join(directory, path.basename(filePath, ext));
      if (ext !== requiredFormat.container) {
        return `${pathWithoutExt}.${requiredFormat.container}`;
      }
    };

    this.FilePath = verifyFileExt(FilePath);
    this.CurrentFormatId = id;
    this.CurrentFormatName = requiredFormat.name;
    this.willEncode = willEncode;
    this.DownloaderInfo = formatDetails;

    this.UpdateStatus("waiting");

    const dir = path.join(
      os.tmpdir(),
      "youtubedl",
      this.CurrentFormatId.toString(),
      this.VideoId
    );
    for (const format of Object.keys(this.DownloaderInfo)) {
      const out = `${this.VideoId}.${format}`;
      this._Downloader
        .call("addUri", [this.DownloaderInfo[format].url], {
          dir,
          out
        })
        .then(data => {
          this.DownloaderInfo[format].downloadId = data;
        })
        .catch(err => {
          throw err;
        });
    }
  }

  async completed() {
    const format = this.DownloadInfo.find(p => p.id === this.CurrentFormatId);
    const dir = path.join(
      os.tmpdir(),
      "youtubedl",
      this.CurrentFormatId.toString(),
      this.VideoId
    );
    if (fs.lstatSync(dir).isDirectory()) {
      const isAudio = format.type !== "both";
      const isCombined = format.audioFormatTag === format.videoFormatTag;
      const audioFile = path.join(dir, `${this.VideoId}.audio`);
      const videoFile = path.join(dir, `${this.VideoId}.video`);
      if (isCombined && fs.statSync(videoFile).isFile()) {
        fs.copyFileSync(videoFile, this.FilePath);
        fs.unlinkSync(videoFile);
      } else if (isAudio && fs.statSync(audioFile).isFile()) {
        fs.copyFileSync(audioFile, this.FilePath);
        fs.unlinkSync(audioFile);
      } else if (
        fs.statSync(audioFile).isFile() &&
        fs.statSync(videoFile).isFile()
      ) {
        await new Promise((res, rej) => {
          ffmpeg.ffprobe(audioFile, (err, metadata) => {
            if (err) return rej(err);
            this.duration = metadata.format.duration;
            res();
          });
        });

        return new Promise((rs, rj) => {
          ffmpeg()
            .addInput(videoFile)
            .videoCodec("copy")
            .inputFormat(this.DownloaderInfo.video.container)
            .addInput(audioFile)
            .inputFormat(this.DownloaderInfo.audio.container)
            .audioCodec("copy")
            .on("start", cmd => {
              this.UpdateStatus("encoding");
            })
            .on("end", e => {
              fs.unlinkSync(audioFile);
              fs.unlinkSync(videoFile);
              this.UpdateStatus("complete");
              rs(e);
            })
            .on("progress", progress => {
              progress.timemark = giveMeSeconds(progress.timemark);
              this.EncodingProgress = {
                ...progress,
                percent: Math.round(progress.timemark / this.duration) * 100,
                duration: this.duration
              };
            })
            .on("error", error => {
              rj(error);
            })
            .output(this.FilePath)
            .run();
        });
      } else {
        throw Error("No clue!");
      }
    } else {
      throw Error("Temp was deleted");
    }
  }

  // pauseDownload() {
  //   for (const format of Object.values(this.DownloaderInfo)) {
  //     this._callDownloader("pause", format.downloadId)
  //       .then(info => {
  //         this.UpdateStatus("paused");
  //       })
  //       .catch(err => {
  //         this.Error = err;
  //       });
  //   }
  // }

  // unPauseDownload() {
  //   for (const format of Object.values(this.DownloaderInfo)) {
  //     this._callDownloader("unpause", format.downloadId)
  //       .then(info => {
  //         this.UpdateStatus("downloading");
  //       })
  //       .catch(err => {
  //         this.Error = err;
  //       });
  //   }
  // }

  // removeDownload() {
  //   for (const format of Object.values(this.DownloaderInfo)) {
  //     this._callDownloader("remove", format.downloadId)
  //       .then(info => {
  //         this.UpdateStatus("removed");
  //       })
  //       .catch(err => {
  //         this.Error = err;
  //       });
  //   }
  // }

  refreshStatus() {
    for (const [key, format] of Object.entries(this.DownloaderInfo)) {
      if (format.downloadId === undefined) continue;
      this._Downloader
        .call("tellStatus", format.downloadId)
        .then(result => {
          this.DownloaderInfo[key].status =
            result.status === "active" ? "downloading" : result.status;
          this.DownloaderInfo[key].progress = {
            completedLength: parseInt(result.completedLength),
            totalLength: parseInt(result.totalLength),
            downloadSpeed: parseInt(result.downloadSpeed)
          };
        })
        .catch(err => {
          throw err;
        });
    }
  }

  progressHandler() {
    this._Downloader.on("onDownloadStart", params => {
      const downloadId = params[0].gid;
      for (const [key, format] of Object.entries(this.DownloaderInfo)) {
        if (format.downloadId === downloadId) {
          this.DownloaderInfo[key].status = "downloading";
          this.UpdateStatus("downloading");
        }
      }
    });

    this._Downloader.on("onDownloadComplete", params => {
      const downloadId = params[0].gid;
      for (const [key, format] of Object.entries(this.DownloaderInfo)) {
        if (format.downloadId === downloadId) {
          this.DownloaderInfo[key].status = "complete";
        }
      }
    });

    this._Downloader.on("onDownloadError", params => {
      const downloadId = params[0].gid;
      for (const format of Object.values(this.DownloaderInfo)) {
        if (format.downloadId === downloadId) {
          format.status = "download-error";
          this.UpdateStatus("download-error");
        }
      }
    });

    const CheckIfBothFormatComplete = () => {
      const { length } = Object.keys(this.DownloaderInfo);
      return Object.entries(this.DownloaderInfo).reduce((pre, cur) => {
        if (!pre) {
          return length === 1 ? cur[1].status === "complete" : cur;
        }
        if (cur) {
          return pre[1].status === "complete" && cur[1].status === "complete";
        }
        return pre[1].status === "complete";
      }, false);
    };

    const RunRefreshStatusPeriodically = async () => {
      await this.refreshStatus();
      if (CheckIfBothFormatComplete()) {
        this.UpdateStatus("download-complete");
        await this.completed();
        clearTimeout(this.ProgressHandlerTimeout);
      }
      this.ProgressHandlerTimeout = setTimeout(
        RunRefreshStatusPeriodically,
        100
      );
    };

    RunRefreshStatusPeriodically();
  }
}

module.exports = QueueItem;
