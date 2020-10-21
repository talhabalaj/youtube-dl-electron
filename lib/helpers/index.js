const sweetalert2 = require("sweetalert2");
const fetch = require("node-fetch");

module.exports = {
  // Helper Function
  /**
   *
   * @param {String} fileName
   */
  removeIllegalCharacters(fileName) {
    return fileName.replace(/[/\\?%*:|"<>]/g, "-");
  },
  /**
   * convert 00:01:00.00 to 60s
   * @param {String} time "00:00:00.00" format
   * @returns {Float} seconds
   */
  giveMeSeconds(time) {
    const splittedTime = time.split(":");

    const hours = parseFloat(splittedTime[0]);
    const mins = parseFloat(splittedTime[1]);
    const seconds = parseFloat(splittedTime[2]);

    const totalTime = hours * 60 * 60 + mins * 60 + seconds;

    return totalTime;
  },
  /**
   *
   * @param {Node} container
   */
  showLoading(container) {
    container.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#B71919">
    <g fill="none" fill-rule="evenodd" stroke-width="2">
        <circle cx="22" cy="22" r="1">
            <animate attributeName="r"
                begin="0s" dur="1.8s"
                values="1; 20"
                calcMode="spline"
                keyTimes="0; 1"
                keySplines="0.165, 0.84, 0.44, 1"
                repeatCount="indefinite" />
            <animate attributeName="stroke-opacity"
                begin="0s" dur="1.8s"
                values="1; 0"
                calcMode="spline"
                keyTimes="0; 1"
                keySplines="0.3, 0.61, 0.355, 1"
                repeatCount="indefinite" />
        </circle>
        <circle cx="22" cy="22" r="1">
            <animate attributeName="r"
                begin="-0.9s" dur="1.8s"
                values="1; 20"
                calcMode="spline"
                keyTimes="0; 1"
                keySplines="0.165, 0.84, 0.44, 1"
                repeatCount="indefinite" />
            <animate attributeName="stroke-opacity"
                begin="-0.9s" dur="1.8s"
                values="1; 0"
                calcMode="spline"
                keyTimes="0; 1"
                keySplines="0.3, 0.61, 0.355, 1"
                repeatCount="indefinite" />
        </circle>
    </g>
  </svg>`;
  },

  /**
   * Capitalize a string
   * @param {String} string
   */
  capitalize(string) {
    return string && string[0].toUpperCase() + string.slice(1);
  },

  Disappear(Element) {
    Element.classList.add("byebye");
  },

  Appear(Element) {
    if (Element.classList.contains("byebye"))
      Element.classList.remove("byebye");
  },
  /**
   * Generate a random string
   * @param {Int} length
   * @returns {String}
   */
  generateRandomString(length) {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  },
  /**
   * Alert with SWAL2
   * @param {String} type "success", "error", "info"
   * @param {String} message
   * @returns {String}
   */
  alert(type, msg) {
    sweetalert2({
      title: this.capitalize(type),
      text: msg,
      type,
      customClass: "modal",
      buttonsStyling: false,
      confirmButtonClass: "btn"
    });
  },
  async getInfo(videoID) {
    return await (await fetch(
      `https://youtube-dl-web-api.herokuapp.com/info/${videoID}`
    )).json();
  }
};
