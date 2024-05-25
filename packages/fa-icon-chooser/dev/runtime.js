// This dev-only module isn't processed by the bundler like the others,
// so we can't use a node env var to set this. Just hardcode it in one
// place at the top.
const API_URL = "https://api.fontawesome.com";

const FaIconChooserDevExports = (function () {
  let showingIconChooser = false;
  let localConfig = undefined;
  const localDevMissingMsg =
    "DEV: your local dev config in local.json is required but has not yet been loaded.";

  function getUrlText(url) {
    // To simulate a fatal error, uncomment the following line:
    // return Promise.reject('simulated fatal error')

    return fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.text();
        } else {
          throw new Error(`DEBUG: bad query for url: ${url}`);
        }
      });
  }

  function handleQuery(query, variables) {
    return new Promise((resolve, reject) => {
      const headers = {
        "Content-Type": "application/json",
      };

      getAccessToken()
        .then((token) => {
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            console.log(
              "handleQuery: using fresh access token to issue authorized request",
            );
          } else {
            console.log(
              "handleQuery: no access token found -- sending an unauthorized request",
            );
          }

          const cleanedQuery = query.replace(/\s+/g, " ");

          return fetch(API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: cleanedQuery,
              variables,
            }),
          });
        })
        .then((response) => {
          if (response.ok) {
            response.json()
              .then((json) => resolve(json))
              .catch((e) => reject(e));
          } else {
            reject("bad query");
          }
        })
        .catch((e) => reject(e));
    });
  }

  function handleResult(result) {
    const resultElement = document.querySelector("#result");
    const preElement = document.createElement("pre");
    const text = document.createTextNode(JSON.stringify(result.detail));
    preElement.appendChild(text);
    resultElement.appendChild(preElement);
  }

  function clearResult() {
    document.querySelectorAll("#result pre").forEach((child) => child.remove());
  }

  function addIconChooser(props) {
    const container = document.querySelector("#fa-icon-chooser-container");
    const el = document.createElement("fa-icon-chooser");
    el.handleQuery = handleQuery;
    el.getUrlText = getUrlText;
    el.addEventListener("finish", handleResult);

    const slotFatalErrorHeader = document.createElement("p");
    slotFatalErrorHeader.setAttribute("slot", "fatal-error-heading");
    const slotFatalErrorHeaderMsg = document.createTextNode("Fatal Error");
    slotFatalErrorHeader.appendChild(slotFatalErrorHeaderMsg);
    el.appendChild(slotFatalErrorHeader);

    Object.keys(props).map((prop) => {
      el.setAttribute(prop, props[prop]);
    });

    container.appendChild(el);
  }

  function closeIconChooser() {
    document.querySelector("fa-icon-chooser").remove();
  }

  function setupHead() {
    if (!localConfig) throw new Error(localDevMissingMsg);
    // If there's no head config, we have nothing left to do here.
    if (!localConfig.head) return;

    const { head } = localConfig;

    Object.keys(head).map((elementType) => {
      const el = document.createElement(elementType);
      Object.keys(head[elementType]).map((attr) => {
        el.setAttribute(attr, head[elementType][attr]);
      });
      document.head.appendChild(el);
    });
  }

  function toggleIconChooser() {
    if (showingIconChooser) {
      closeIconChooser();

      const toggleIconContainer = document.querySelector(
        "#toggle-icon-container",
      );
      if (toggleIconContainer) {
        while (toggleIconContainer.firstChild) {
          toggleIconContainer.removeChild(toggleIconContainer.firstChild);
        }
        const newIcon = document.createElement("i");
        newIcon.setAttribute("class", "fas fa-toggle-off");
        toggleIconContainer.appendChild(newIcon);
      }

      clearResult();
      showingIconChooser = false;
    } else {
      showIconChooser();

      const toggleIconContainer = document.querySelector(
        "#toggle-icon-container",
      );
      if (toggleIconContainer) {
        while (toggleIconContainer.firstChild) {
          toggleIconContainer.removeChild(toggleIconContainer.firstChild);
        }
        const newIcon = document.createElement("i");
        newIcon.setAttribute("class", "fas fa-toggle-on");
        toggleIconContainer.appendChild(newIcon);
      }

      showingIconChooser = true;
    }
  }

  function loadLocalConfig() {
    const failMsg = "DEV: failed request to get local.json:";

    return fetch("/dev/local.json")
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          return Promise.reject(response);
        }
      })
      .then((config) => {
        localConfig = config;
      })
      .catch((e) => {
        console.error(failMsg, e);
        return Promise.reject(failMsg);
      });
  }

  function getAccessToken() {
    const apiToken = localConfig && localConfig.apiToken;
    if (!apiToken) {
      // If there's no apiToken, then it's not an error to resolve an undefined access token.
      return Promise.resolve(undefined);
    }
    const tokenJSON = window.localStorage.getItem("token");
    const tokenObj = tokenJSON ? JSON.parse(tokenJSON) : undefined;
    const freshToken = (tokenObj &&
        Math.floor(Date.now() / 1000) <= tokenObj.expiresAtEpochSeconds)
      ? tokenObj.token
      : undefined;

    if (freshToken) return Promise.resolve(freshToken);

    return fetch(`${API_URL}/token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${localConfig.apiToken}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          response.json()
            .then((obj) => {
              const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) +
                obj["expires_in"];

              // WARNING: storing an access token in localStorage may not be good enough
              // security in other situations. This is a development-only situation
              // intended to run on a local development machine, so this seems like
              // good enough security for that use case.
              window.localStorage.setItem(
                "token",
                JSON.stringify({
                  token: obj["access_token"],
                  expiresAtEpochSeconds,
                }),
              );
            })
            .catch((e) => {
              throw e;
            });
        } else {
          const msg = "DEV: unexpected token endpoint response";
          console.error(msg, response);
          throw new Error(msg);
        }
      })
      .catch((e) => {
        throw e;
      });
  }

  function showIconChooser() {
    if (!localConfig) throw new Error(localDevMissingMsg);
    if (!localConfig.props) {
      throw new Error("DEV: missing props key in your local.json");
    }

    const { props } = localConfig;

    if (!props["kit-token"]) {
      if (!props.version) {
        throw new Error(
          "DEV: your local.json must have a props key with either a version subkey or a kit-token subkey",
        );
      }
      addIconChooser(props);
      return;
    }

    getAccessToken()
      .then((_token) => addIconChooser(props))
      .catch((e) => {
        throw e;
      });
  }

  function getLocalConfig() {
    return localConfig;
  }

  loadLocalConfig()
    .then(setupHead)
    .catch((e) => {
      throw e;
    });

  document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.querySelector("#fa-icon-chooser-toggle");

    if (toggle) {
      toggle.addEventListener("click", toggleIconChooser);
    }
  });

  return {
    toggleIconChooser,
    handleQuery,
    handleResult,
    getLocalConfig,
    getUrlText,
  };
})();

if ("undefined" !== typeof module) {
  module.exports = FaIconChooserDevExports;
}
