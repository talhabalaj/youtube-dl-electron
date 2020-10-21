const { remote, ipcRenderer } = require("electron");
const helpers = require("../../lib/helpers");

// Parsing Handler
const downloadForm = document.querySelector("#download-form");
const resultDiv = document.querySelector("#parsedResult");
const parseButton = document.querySelector("#parse");
const inputUrl = document.querySelector("#youtubeUrl");

const GotoInitPage = () => {
  helpers.Appear(parseButton);
  helpers.Disappear(resultDiv);
};

/* Result Template
<div class="radio">
 <input type="radio" id="22" name="video"> 
<label for="22">720p HD Bitrate mime_type
</label>
</div> */

function parseUrl(url, callback) {
  const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)[1];
  ipcRenderer.send("get:videoDetails", {
    videoId
  });
  ipcRenderer.on("receive:videoDetails", (event, args) => {
    if (args.error) {
      helpers.alert(args.error);
      GotoInitPage();
      ipcRenderer.send("queue:remove", {
        queueId
      });
      return;
    }
    const { queueId, details } = args;
    const { info, formats } = details;
    let html = "";
    html += `<p>${info.title}</p>`;
    html += "<div class='radios'>";
    for (const format of formats) {
      html += `
          <div class="radio">
            <input type="radio" id="${format.id}" 
            value="${format.id}" 
            name="video"> 
            <label for="${format.id}">
              ${format.name}
            </label>
          </div>`.trim();
    }
    html += "</div>";
    html += `<button id="download" class="btn download byebye">Download</button><button id="back" class="btn">Back</button>`;
    resultDiv.innerHTML = html;
    callback(info, formats, queueId);
  });
}

parseButton.addEventListener("click", () => {
  if (inputUrl.value === "") {
    helpers.alert("error", "Please enter a YouTube url.");
    return;
  }
  helpers.showLoading(resultDiv);
  helpers.Appear(resultDiv);
  helpers.Disappear(parseButton);
  parseUrl(inputUrl.value, InitDownloadHandler);
});

// Parsing Handler End

// Download Handler Start
function InitDownloadHandler(info, formats, queueId) {
  const RadioContainer = document.querySelector(".radios");
  const Radios = document.querySelectorAll("input[name='video']");
  const DownloadButton = document.querySelector("#download");
  const BackButton = document.querySelector("#back");

  Radios.forEach(Radio =>
    Radio.addEventListener("change", () => {
      helpers.Appear(DownloadButton);
    })
  );

  BackButton.addEventListener("click", () => {
    GotoInitPage();
    ipcRenderer.send("queue:remove", {
      queueId
    });
  });

  DownloadButton.addEventListener("click", () => {
    const SelectedRadio = document.querySelector("input[name='video']:checked");
    const RequiredFormat = formats.find(
      preset => SelectedRadio.value === preset.id.toString()
    );

    const { container } = RequiredFormat;

    remote.dialog.showSaveDialog(
      {
        title: "Save as",
        buttonLabel: "Download",
        defaultPath: helpers.removeIllegalCharacters(info.title),
        filters: [
          {
            name: `${RequiredFormat.name}`,
            extensions: [container]
          }
        ]
      },
      FilePath => {
        if (FilePath === undefined) {
          helpers.alert("error", "No file Selected");
          return;
        }
        const RequestDownload = ipcRenderer.sendSync("download:add", {
          queueId,
          videoId: info.videoId,
          format: RequiredFormat.id,
          FilePath
        });

        if (RequestDownload) {
          GotoInitPage();
          helpers.alert("success", "Added to Queue");
        } else {
          helpers.alert("error", "Already exists");
        }
      }
    );
  });
}
