const { ipcRenderer } = require("electron");
const { filesize: FormatFileSize } = require("humanize");
const path = require("path");
const { capitalize } = require("../../lib/helpers");
/* TEMPLATE
        <section id='item1' class='download-item'>
                <div class="flex-2 info">
                    <div class='left'>
                        <div class="info__item">
                            <b>Video Title</b>
                            <span>John Legend - All of Me (Official Video)</span>
                        </div>
                        <div class="info__item">
                            <b>Video Format</b>
                            <span>1080 FHD</span>
                        </div>
                        <div class="info__item">
                            <b>Download Path</b>
                            <span>C:\..\John Legend - All of Me (Official Video)</span>
                        </div>
                    </div>
                    <div class='space'>&nbsp;</div>
                    <div class='right'>
                        <div class="info__item">
                            <b>Progress</b>
                            <span>75%</span>
                        </div>
                        <div class="info__item">
                            <b>Status</b>
                            <span>Downloading</span>
                        </div>
                    </div>
                </div>
                <div class="progress video">
                    <div class='progress-box'>
                        <div class='progress-bar'>
                            <span class='progress-percent'>28%</span>
                        </div>
                    </div>
                    <div class='flex-2 progress-details'>
                        <div class='left status'>
                            <span class='completed-size'>0.00KB</span> of <span class='total-size'>90.00MB</span>
                            completed
                        </div>
                        <div class='right speed'>
                            <span>135.69KB/s</span>
                        </div>
                    </div>
                </div>
                <div class="progress audio">
                    <div class='progress-box'>
                        <div class='progress-bar'>
                            <span class='progress-percent'>28%</span>
                        </div>
                    </div>
                    <div class='flex-2 progress-details'>
                        <div class='left status'>
                            <span class='completed-size'>0.00KB</span> of <span class='total-size'>90.00MB</span>
                            completed
                        </div>
                        <div class='right speed'>
                            <span>135.69KB/s</span>
                        </div>
                    </div>
                </div>
                <div class="progress encoding">
                    <div class='progress-box'>
                        <div class='progress-bar'>
                            <span class='progress-percent'>28%</span>
                        </div>
                    </div>
                    <div class='flex-2 progress-details'>
                        <div class='left status'>
                            <span class='completed-size'>500</span> of <span class='total-size'>9000</span>
                            completed
                        </div>
                        <div class='right speed'>
                            <span>24 fps</span>
                        </div>
                    </div>
                </div>

            </section>
        */
const queueDiv = document.querySelector("#queue");
const addButton = document.querySelector("#addButton");

addButton.addEventListener("click", e => {
  ipcRenderer.send("window-open:addWindow");
});

const initStatus = () => {
  const queue = ipcRenderer.sendSync("download:status");
  let html = "";
  for (const item of queue) {
    html += createDownloadItem(item);
  }
  queueDiv.innerHTML = html;
  updateStatus();
};

const updateStatus = () => {
  const queue = ipcRenderer.sendSync("download:status");
  for (const item of queue) {
    if (document.querySelector(`#item${item.id}`) == null) {
      const html = createDownloadItem(item) + queueDiv.innerHTML;
      queueDiv.innerHTML = html;
    } else {
      const itemContainer = document.querySelector(`#item${item.id}`);

      let status = item.Status;

      if (status.includes("-")) {
        const [part0, part1] = status.split("-");
        status = `${capitalize(part0)} ${part1}`;
      } else {
        status = `${capitalize(status)}`;
      }

      const totalProgressSpan = itemContainer.querySelector(".total-progress");
      const currentStatusSpan = itemContainer.querySelector(".current-status");
      currentStatusSpan.textContent = status;
      totalProgressSpan.textContent = `
      ${tellProgress(item).percentage.toFixed(2)}%`;

      for (const [formatName, format] of Object.entries(item.DownloaderInfo)) {
        if (format.progress) {
          const {
            totalLength,
            completedLength,
            downloadSpeed,
            status
          } = format.progress;

          let percentage;

          if (totalLength === 0) percentage = 0;
          else percentage = Math.round((completedLength / totalLength) * 100);

          const currentFormat = itemContainer.querySelector(`.${formatName}`);
          const progressBar = currentFormat.querySelector(".progress-bar");
          const progressBarText = currentFormat.querySelector(
            ".progress-percent"
          );
          const completedSizeSpan = currentFormat.querySelector(
            ".completed-size"
          );
          const totalSizeSpan = currentFormat.querySelector(".total-size");
          const downloadSpeedSpan = currentFormat.querySelector(
            ".download-speed"
          );

          progressBar.style.width = `${percentage}%`;
          progressBarText.textContent = `${percentage}%`;
          completedSizeSpan.textContent = FormatFileSize(completedLength);
          totalSizeSpan.textContent = FormatFileSize(totalLength);
          downloadSpeedSpan.textContent =
            completedLength === totalLength
              ? status
              : `${FormatFileSize(downloadSpeed)}/s`;
        }
      }
      if (item.willEncode) {
        let { EncodingProgress } = item;
        if (EncodingProgress === null) {
          EncodingProgress = {
            timemark: 0,
            duration: 0,
            currentFps: 0,
            percent: 0,
            status: "waiting"
          };
        } else if (
          Math.round(EncodingProgress.duration) ===
          Math.round(EncodingProgress.timemark)
        ) {
          EncodingProgress.status = "finished";
        } else {
          EncodingProgress.status = "encoding";
        }

        const currentFormat = itemContainer.querySelector(`.encoding`);
        const progressBar = currentFormat.querySelector(".progress-bar");
        const progressBarText = currentFormat.querySelector(
          ".progress-percent"
        );
        const completedSizeSpan = currentFormat.querySelector(
          ".completed-size"
        );
        const totalSizeSpan = currentFormat.querySelector(".total-size");
        const currentStatusSpan = currentFormat.querySelector(
          ".current-status"
        );

        progressBar.style.width = `${EncodingProgress.percent}%`;
        progressBarText.textContent = `${EncodingProgress.percent}%`;
        completedSizeSpan.textContent = 24 * EncodingProgress.timemark;
        totalSizeSpan.textContent = 24 * EncodingProgress.duration;
        currentStatusSpan.textContent = EncodingProgress.status;
      }
    }
  }
  setTimeout(updateStatus, 100);
};

function createDownloadItem(item) {
  let html = "";
  let status = item.Status;

  if (status.includes("-")) {
    const [part0, part1] = status.split("-");
    status = `${capitalize(part0)} ${part1}`;
  } else {
    status = `${capitalize(status)}`;
  }

  const fileName = path.basename(item.FilePath);
  const filePath = item.FilePath;

  html += `<section id='item${item.id}' class='download-item'>
  <div class="flex-2 info">
      <div class='left'>
          <div class="info__item">
              <b>Video Title</b>
              <span>${item.VideoInfo.title}</span>
          </div>
          <div class="info__item">
              <b>Video Format</b>
              <span>${item.Format}</span>
          </div>
          <div class="info__item">
              <b>Download Path</b>
              <span>${filePath}</span>
          </div>
      </div>
      <div class='space'>&nbsp;</div>
      <div class='right'>
          <div class="info__item">
              <b>Progress</b>
              <span class="total-progress">
              ${tellProgress(item).percentage.toFixed(2)}%
              </span>
          </div>
          <div class="info__item">
              <b>Status</b>
              <span class="current-status">${status}</span>
          </div>
      </div>
  </div>
  `;
  const formats = item.DownloaderInfo;
  for (const [formatName, format] of Object.entries(formats)) {
    if (format.progress) {
      const { totalLength, completedLength, downloadSpeed } = format.progress;
      let percentage;
      if (totalLength === 0) {
        percentage = 0;
      } else {
        percentage = Math.round((completedLength / totalLength) * 100);
      }

      html += `
      <div class="progress ${formatName}">
        <div class='progress-box'>
          <div class='progress-bar' style="width: ${percentage}%">
            <span class='progress-percent'>${percentage}%</span>
          </div>
        </div>
        <div class='flex-2 progress-details'>
          <div class='left status'>
            <span class='completed-size'>
            ${FormatFileSize(completedLength)}
            </span> 
            of 
            <span class='total-size'>
            ${FormatFileSize(totalLength)}
            </span>
            completed
          </div>
          <div class='right speed'>
          <span class='download-speed'>${FormatFileSize(downloadSpeed)}/s</span>
          </div>
        </div>
      </div>`;
    }
  }
  if (item.willEncode) {
    let { EncodingProgress } = item;
    if (EncodingProgress === null) {
      EncodingProgress = {
        timemark: 0,
        duration: 0,
        currentFps: 0,
        percent: 0,
        status: "waiting"
      };
    } else if (
      Math.round(EncodingProgress.duration) ===
      Math.round(EncodingProgress.timemark)
    ) {
      EncodingProgress.status = "completed";
    } else {
      EncodingProgress.status = "encoding";
    }

    html += `
    <div class="progress encoding">
        <div class='progress-box'>
            <div class='progress-bar ${
              EncodingProgress.status
            }' style="width: ${EncodingProgress.percent}%">
                <span class='progress-percent'>${
                  EncodingProgress.percent
                }%</span>
            </div>
        </div>
        <div class='flex-2 progress-details'>
            <div class='left status'>
                <span class='completed-size'>${Math.round(
                  24 * EncodingProgress.timemark
                )}</span> of <span class='total-size'>${Math.round(
      24 * EncodingProgress.timemark
    )}</span>
                completed
            </div>
            <div class='right speed'>
                <span class='current-status'>${EncodingProgress.status}</span>
            </div>
        </div>
    </div>`;
  }

  html += `</section>`;
  return html;
}

const tellProgress = item => {
  const progress = {};
  let totalLength = 0;
  let completedLength = 0;
  let multiple = 100;
  let encodingPercentage = 0;

  for (const [key, format] of Object.entries(item.DownloaderInfo)) {
    if (!format.progress) continue;
    completedLength += format.progress.completedLength;
    totalLength += format.progress.totalLength;
  }

  if (item.willEncode) {
    multiple = 90;
    if (item.EncodingProgress !== null)
      encodingPercentage = (item.EncodingProgress.percent || 0) / 10;
    else encodingPercentage = 0;
  }

  const downloadPercentage = (completedLength / totalLength) * multiple;
  const totalPercentage = downloadPercentage + encodingPercentage;

  progress.percentage = totalPercentage;

  progress.downloadSpeed = Array.from(
    Object.values(item.DownloaderInfo)
  ).reduce((pre, cur) => pre.downloadSpeed + cur.downloadSpeed, 0);

  return progress;
};

initStatus();
