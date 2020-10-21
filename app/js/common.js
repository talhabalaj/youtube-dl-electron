const { remote } = require("electron");

(() => {
  const minButton = document.querySelector("#min");
  const maxButton = document.querySelector("#max");
  const crossButton = document.querySelector("#cross");

  const buttons = { min: minButton, max: maxButton, cross: crossButton };

  for (const [perform, button] of Object.entries(buttons)) {
    button.addEventListener("click", e => {
      const currentWindow = remote.getCurrentWindow();
      if (perform === "max") {
        if (currentWindow.isMaximized()) {
          currentWindow.unmaximize();
        } else {
          currentWindow.maximize();
        }
      } else if (perform === "cross") currentWindow.close();
      else if (perform === "min") currentWindow.minimize();
    });
  }
})();
