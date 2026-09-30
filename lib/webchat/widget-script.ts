/** Embeddable bubble. Branding comes from the session response. No Supabase key is shipped. */
export function widgetScript(): string {
  return `(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-helixa-key");
  if (!key) return;
  var origin = new URL(script.src, window.location.href).origin;
  var storageKey = "helixa_visitor_" + key;
  var html = document.documentElement;
  var dirAttr = script.getAttribute("data-dir");
  var rtl = dirAttr === "rtl" || html.getAttribute("dir") === "rtl" || /^(ar|fa|he|ur)/i.test(html.getAttribute("lang") || "");
  var root = document.createElement("div");
  root.setAttribute("dir", rtl ? "rtl" : "ltr");
  root.style.cssText = "all:initial;position:fixed;z-index:2147483000;bottom:16px;" + (rtl ? "left:16px;" : "right:16px;") + "font-family:system-ui,sans-serif;";
  var color = "#111111";
  var panel = document.createElement("div");
  panel.style.cssText = "display:none;width:min(360px,calc(100vw - 32px));height:460px;background:#fff;color:#111;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);overflow:hidden;margin-bottom:8px;flex-direction:column;";
  var header = document.createElement("div");
  header.style.cssText = "padding:12px 14px;color:#fff;font-weight:600;font-size:14px;";
  header.textContent = "Chat";
  var log = document.createElement("div");
  log.style.cssText = "flex:1;overflow:auto;padding:12px;background:#f6f6f6;font-size:14px;";
  var form = document.createElement("form");
  form.style.cssText = "display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff;";
  var input = document.createElement("input");
  input.type = "text";
  input.maxLength = 2000;
  input.placeholder = rtl ? "اكتب رسالة" : "Message";
  input.style.cssText = "flex:1;border:1px solid #ddd;border-radius:10px;padding:8px 10px;font:inherit;";
  var send = document.createElement("button");
  send.type = "submit";
  send.textContent = rtl ? "إرسال" : "Send";
  send.style.cssText = "border:0;border-radius:10px;padding:8px 12px;color:#fff;font:inherit;cursor:pointer;";
  var bubble = document.createElement("button");
  bubble.type = "button";
  bubble.textContent = rtl ? "تحدث" : "Chat";
  bubble.style.cssText = "border:0;border-radius:999px;padding:12px 16px;color:#fff;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);";
  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(form);
  panel.style.display = "none";
  root.appendChild(panel);
  root.appendChild(bubble);
  document.body.appendChild(root);
  function paint(c) {
    color = c || color;
    header.style.background = color;
    send.style.background = color;
    bubble.style.background = color;
  }
  paint(color);
  function readStore() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch (e) { return null; }
  }
  function writeStore(value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }
  var session = readStore();
  function draw(messages) {
    log.textContent = "";
    (messages || []).forEach(function (message) {
      var line = document.createElement("div");
      var mine = message.direction === "in";
      line.style.cssText = "margin:6px 0;padding:8px 10px;border-radius:12px;max-width:85%;white-space:pre-wrap;word-break:break-word;" + (mine ? "margin-inline-start:auto;background:" + color + ";color:#fff;" : "background:#fff;color:#111;");
      line.textContent = message.content || "";
      log.appendChild(line);
    });
    log.scrollTop = log.scrollHeight;
  }
  function call(path, body) {
    return fetch(origin + path + "?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ publicKey: key }, body))
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); });
  }
  function ensure() {
    var stored = readStore();
    var payload = stored && stored.visitorId && stored.secret ? { visitorId: stored.visitorId, secret: stored.secret } : {};
    return call("/api/webchat/session", payload).then(function (res) {
      if (!res.ok) throw new Error((res.data && res.data.error) || "session");
      if (res.data.secret) writeStore({ visitorId: res.data.visitorId, secret: res.data.secret });
      session = readStore();
      if (res.data.name) header.textContent = res.data.name;
      paint(res.data.color);
      if (res.data.locale === "ar" && !dirAttr) root.setAttribute("dir", "rtl");
      return res.data;
    });
  }
  var timer = null;
  function poll() {
    if (!session || !session.visitorId) return;
    call("/api/webchat/messages", { visitorId: session.visitorId, secret: session.secret }).then(function (res) {
      if (res.ok && res.data && res.data.messages) draw(res.data.messages);
    }).catch(function () {});
  }
  function open() {
    var openNow = panel.style.display !== "flex";
    panel.style.display = openNow ? "flex" : "none";
    if (!openNow) { if (timer) clearInterval(timer); return; }
    ensure().then(function () { poll(); timer = setInterval(poll, 3000); }).catch(function () {
      log.textContent = rtl ? "هذه الصفحة غير مسموح لها بالدردشة." : "This site is not allowed to use this chat.";
    });
  }
  bubble.addEventListener("click", open);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text || !session) return;
    input.value = "";
    call("/api/webchat/message", { visitorId: session.visitorId, secret: session.secret, text: text }).then(function () { poll(); });
  });
})();
`
}
