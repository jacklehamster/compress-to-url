import { compressToUrl, decompressFromUrl } from "./dist/index.js";

// Debounce function to limit compression calls
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Real-time encoding
const encodeAsYouType = debounce(async (code) => {
  try {
    const result = await compressToUrl(code, {
      inputType: "string",
      mimeType: "text/html",
      normalizeWhitespace: false,
    });
    const urlField = document.querySelector("#url");
    urlField.value = result.payload;
    document.querySelector("#counter").textContent =
      `Characters: ${result.size}`;
    updateShareLink(result.payload);
  } catch (err) {
    console.error(`Error compressing: ${err.message}`);
  }
}, 300);

document.querySelector("#code").addEventListener("input", (e) => {
  encodeAsYouType(e.target.value);
});

window.convertToText = async () => {
  const url = document.querySelector("#url").value;
  try {
    const { data } = await decompressFromUrl(url);
    console.log(data);
    document.querySelector("#code").value = data;
    document.querySelector("#counter").textContent =
      `Characters: ${url.length}`;
    updateShareLink(url);
  } catch (err) {
    alert(`Error decompressing: ${err.message}`);
  }
};

function updateShareLink(payload) {
  const shareLink = document.querySelector("#share-link");
  const url = new URL(window.location.href);
  url.searchParams.set("u", payload);
  shareLink.innerHTML = `Shareable Link: <a href="${url.toString()}" target="_blank">${url.toString()}</a>`;
}

// Handle URL parameter on load
window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedHtml = urlParams.get("u");
  if (encodedHtml) {
    const urlField = document.querySelector("#url");
    urlField.value = encodedHtml;
    document.querySelector("#counter").textContent =
      `Characters: ${encodedHtml.length}`;
    try {
      const { data } = await decompressFromUrl(encodedHtml);
      document.querySelector("#code").value = data;
      updateShareLink(encodedHtml);
    } catch (err) {
      alert(`Error decoding URL parameter: ${err.message}`);
    }
  }
});

document.querySelector("#url").addEventListener("input", (e) => {
  document.querySelector("#counter").textContent =
    `Characters: ${e.target.value.length}`;
  updateShareLink(e.target.value);
});
