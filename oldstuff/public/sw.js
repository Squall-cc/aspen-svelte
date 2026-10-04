importScripts("/scram/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

let injectScripts = [];
let extScripts = [];

async function loadInjectConfig() {
  try {
    const res = await fetch("/inject.json"); //gets inject.json
    const config = await res.json();
    injectScripts = config.scripts || [];
  } catch {
    injectScripts = [];
  }
}

function buildInjectTags() {
  return [...injectScripts, ...extScripts]
    .map((s) => {
      if (s.src) return `<script src="${s.src}"></script>`;
      if (s.inline) return `<script>${s.inline}</script>`; // ad injecting???????????
      return "";
    })
    .join("\n");
}

loadInjectConfig();

self.addEventListener("message", (event) => {
  if (event.data?.type === "set-ext-scripts") {
    extScripts = event.data.scripts || [];
  }
});

scramjet.addEventListener("handleResponse", (event) => {
  if (event.destination !== "document" && event.destination !== "iframe") return;

  const tags = buildInjectTags();
  if (!tags) return;

  if (typeof event.responseBody === "string") {
    if (event.responseBody.includes("</head>")) {
      event.responseBody = event.responseBody.replace("</head>", tags + "\n</head>");
    } else if (event.responseBody.includes("</body>")) {
      event.responseBody = event.responseBody.replace("</body>", tags + "\n</body>");
    } else {
      event.responseBody += tags; //cuz html minifiers exist
    }
  }
});

async function handleScramjet(event) {
  await scramjet.loadConfig();
  return scramjet.fetch(event);
}
self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    await scramjet.loadConfig(); // fix attempt 1
    if (scramjet.route(event)) {
      return scramjet.fetch(event);
    }
    return fetch(event.request);
  })());
});