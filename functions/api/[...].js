export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const TARGET = "http://prem-eu4.bot-hosting.net:20086";
  const targetUrl = TARGET + url.pathname + url.search;

  return fetch(targetUrl, {
    method: request.method,
    headers: { "Content-Type": "application/json" },
    body: request.method === "GET" ? null : request.body
  });
}
