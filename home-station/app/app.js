(() => {
  const $ = (id) => document.getElementById(id);
  const state = { sessions: [], activeId: null, busy: false, speak: false, recognition: null, listening: false, eventAbort: null };
  const tokenKey = "home-station-token";
  const token = () => sessionStorage.getItem(tokenKey) || "";
  const headers = (json = false) => Object.assign({}, json ? { "content-type": "application/json" } : {}, token() ? { authorization: "Bearer " + token() } : {});
  const api = async (path, options = {}) => {
    const response = await fetch("/api/opencode" + path, Object.assign({}, options, { headers: Object.assign({}, headers(Boolean(options.body)), options.headers || {}) }));
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error((data && (data.error || data.message)) || ("OpenCode API returned " + response.status));
    return data;
  };
  const toast = (message) => {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2800);
  };
  const setConnected = (ok, label) => {
    $("statusDot").classList.toggle("online", ok);
    $("statusText").textContent = label;
    $("connectionPill").classList.toggle("online", ok);
    $("connectionPill").querySelector("span").textContent = ok ? "Connected" : "Offline";
  };
  const sessionTitle = (s) => s.title || s.name || ("Session " + String(s.id || "").slice(0, 8));
  function renderSessions() {
    $("sessionCount").textContent = String(state.sessions.length).padStart(2, "0");
    const host = $("sessions");
    host.replaceChildren();
    if (!state.sessions.length) {
      const empty = document.createElement("div"); empty.className = "empty-side"; empty.textContent = "No sessions yet. Start a new one."; host.append(empty); return;
    }
    for (const session of state.sessions) {
      const button = document.createElement("button");
      button.className = "session-item" + (session.id === state.activeId ? " active" : "");
      button.textContent = sessionTitle(session);
      button.title = sessionTitle(session);
      button.onclick = () => openSession(session.id);
      host.append(button);
    }
  }
  function showConversation() {
    $("welcome").hidden = true;
    $("conversation").hidden = false;
  }
  function showWelcome() {
    $("welcome").hidden = false;
    $("conversation").hidden = true;
    $("activeTitle").textContent = "New session";
    $("messages").replaceChildren();
  }
  function addMessage(role, content, error = false) {
    showConversation();
    const node = document.createElement("article");
    node.className = "message " + role + (error ? " error" : "");
    const label = document.createElement("span"); label.className = "message-role";
    label.textContent = role === "user" ? "YOU" : error ? "SYSTEM ERROR" : "OPENCODE AGENT";
    const body = document.createElement("div"); body.textContent = content;
    node.append(label, body); $("messages").append(node);
    node.scrollIntoView({ behavior: "smooth", block: "end" });
    return body;
  }
  function addTyping() {
    const node = document.createElement("article"); node.className = "message assistant"; node.id = "typing";
    const label = document.createElement("span"); label.className = "message-role"; label.textContent = "AGENT WORKING";
    const dots = document.createElement("div"); dots.className = "typing";
    for (let i = 0; i < 3; i++) { const dot = document.createElement("i"); dots.append(dot); }
    node.append(label, dots); $("messages").append(node); node.scrollIntoView({ behavior: "smooth", block: "end" });
  }
  async function loadSessions() {
    try {
      const data = await api("/session");
      state.sessions = Array.isArray(data) ? data : (data && data.data) || [];
      state.sessions.sort((a, b) => ((b.time && (b.time.updated || b.time.created)) || 0) - ((a.time && (a.time.updated || a.time.created)) || 0));
      renderSessions(); setConnected(true, "OpenCode connected");
    } catch (error) {
      setConnected(false, "Connection unavailable");
      if (/401|unauthorized/i.test(error.message)) $("settingsDialog").showModal();
      $("sessions").replaceChildren();
      const empty = document.createElement("div"); empty.className = "empty-side"; empty.textContent = "OpenCode is not reachable. Check the server and connection token in settings."; $("sessions").append(empty);
    }
  }
  async function newSession() {
    try {
      const data = await api("/session", { method: "POST", body: JSON.stringify({ title: "Home Station session" }) });
      const session = (data && data.data) || data;
      if (!session || !session.id) throw new Error("OpenCode did not return a session ID");
      state.activeId = session.id;
      state.sessions = [session].concat(state.sessions.filter(s => s.id !== session.id));
      renderSessions(); $("messages").replaceChildren(); showConversation(); $("activeTitle").textContent = sessionTitle(session);
      $("promptInput").focus();
      return session.id;
    } catch (error) { addMessage("assistant", error.message, true); return null; }
  }
  async function openSession(id) {
    state.activeId = id; renderSessions();
    const session = state.sessions.find(s => s.id === id);
    $("activeTitle").textContent = session ? sessionTitle(session) : "Session";
    $("messages").replaceChildren(); showConversation();
    try {
      const data = await api("/session/" + encodeURIComponent(id) + "/message");
      const messages = Array.isArray(data) ? data : (data && data.data) || [];
      for (const message of messages) {
        const role = (message.info && message.info.role) || message.role;
        const parts = message.parts || (message.data && message.data.parts) || [];
        const text = parts.filter(p => p.type === "text").map(p => p.text || "").join("\n");
        if (text && (role === "user" || role === "assistant")) addMessage(role, text);
      }
    } catch (error) {
      addMessage("assistant", "Session selected. Could not load earlier messages: " + error.message, true);
    }
    startEventStream();
  }
  function startEventStream() {
    state.eventAbort && state.eventAbort.abort();
    const controller = new AbortController(); state.eventAbort = controller;
    (async () => {
      try {
        const response = await fetch("/api/opencode/global/event", { headers: headers(), signal: controller.signal });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (!controller.signal.aborted) {
          const result = await reader.read(); if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true });
          const chunks = buffer.split("\n\n"); buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find(s => s.startsWith("data:"));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(5).trim());
              const payload = event.payload || event;
              const sessionID = payload.sessionID || (payload.properties && payload.properties.sessionID);
              if (sessionID && sessionID === state.activeId) {
                // TODO: map the exact event schema to live message-part rendering after verifying this fork's API.
              }
            } catch {}
          }
        }
      } catch (error) { if (error.name !== "AbortError") console.debug("Event stream unavailable", error); }
    })();
  }
  async function sendPrompt(prompt) {
    if (!prompt.trim() || state.busy) return;
    let id = state.activeId;
    if (!id) id = await newSession();
    if (!id) return;
    $("promptInput").value = ""; resizeInput();
    addMessage("user", prompt);
    state.busy = true; $("sendButton").disabled = true; addTyping();
    try {
      await api("/session/" + encodeURIComponent(id) + "/message", {
        method: "POST",
        body: JSON.stringify({ parts: [{ type: "text", text: prompt }] })
      });
      $("typing") && $("typing").remove();
      await openSession(id);
      if (state.speak) {
        const replies = $("messages").querySelectorAll(".message.assistant");
        const last = replies[replies.length - 1];
        const spoken = last ? last.innerText.replace(/^OPENCODE AGENT\s*/, "") : "";
        if (spoken) speakText(spoken);
      }
      await loadSessions();
    } catch (error) {
      $("typing") && $("typing").remove();
      addMessage("assistant", error.message + "\n\nCheck that OpenCode is running and that this OpenCode version accepts the session/message API shape.", true);
    } finally {
      state.busy = false; $("sendButton").disabled = false; $("promptInput").focus();
    }
  }
  function resizeInput() { const input = $("promptInput"); input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }
  function speakText(text) {
    if (!("speechSynthesis" in window)) { toast("Speech synthesis is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
    utterance.rate = 1; utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
  function stopListening() {
    try { state.recognition && state.recognition.stop(); } catch {}
    state.listening = false; $("micButton").classList.remove("active"); $("voiceStatus").textContent = "Voice input ready when you tap Talk";
  }
  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { toast("Speech recognition is unavailable in this browser. Try Chrome on Android or desktop."); return; }
    if (state.listening) { stopListening(); return; }
    const recognition = new Recognition(); state.recognition = recognition;
    recognition.lang = navigator.language || "en-US"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onstart = () => { state.listening = true; $("micButton").classList.add("active"); $("voiceStatus").textContent = "Listening… tap Talk to stop"; };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      $("promptInput").value = transcript; resizeInput();
    };
    recognition.onerror = (event) => { $("voiceStatus").textContent = "Voice input: " + event.error; };
    recognition.onend = () => stopListening();
    try { recognition.start(); } catch (error) { toast(error.message); }
  }
  $("composer").addEventListener("submit", (event) => { event.preventDefault(); sendPrompt($("promptInput").value); });
  $("promptInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("composer").requestSubmit(); }
  });
  $("promptInput").addEventListener("input", resizeInput);
  $("newSession").onclick = async () => { state.activeId = null; state.eventAbort && state.eventAbort.abort(); showWelcome(); await newSession(); };
  $("refreshButton").onclick = loadSessions;
  $("micButton").onclick = startListening;
  $("speakToggle").onclick = () => {
    state.speak = !state.speak; $("speakToggle").setAttribute("aria-pressed", String(state.speak));
    $("ttsSetting").checked = state.speak; $("voiceStatus").textContent = state.speak ? "Agent replies will be spoken" : "Voice replies are off";
    if (!state.speak && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };
  $("settingsButton").onclick = () => { $("tokenInput").value = token(); $("ttsSetting").checked = state.speak; $("settingsDialog").showModal(); };
  $("saveSettings").onclick = async () => {
    const value = $("tokenInput").value.trim();
    if (value) sessionStorage.setItem(tokenKey, value); else sessionStorage.removeItem(tokenKey);
    state.speak = $("ttsSetting").checked; $("speakToggle").setAttribute("aria-pressed", String(state.speak));
    $("voiceStatus").textContent = state.speak ? "Agent replies will be spoken" : "Voice replies are off";
    $("settingsDialog").close(); await loadSessions();
  };
  $("testConnection").onclick = async () => {
    $("settingsResult").textContent = "Checking…";
    try {
      const health = await fetch("/api/health").then(r => r.json());
      await api("/session");
      $("settingsResult").textContent = "Connected. Bridge " + health.service + "; OpenCode API reachable.";
    } catch (error) { $("settingsResult").textContent = "Connection failed: " + error.message; }
  };
  $("menuButton").onclick = () => $("sidebar").classList.toggle("open");
  document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => {
    $("promptInput").value = button.dataset.prompt; resizeInput(); $("promptInput").focus();
  }));
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  loadSessions();
})();