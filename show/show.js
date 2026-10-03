import {
  loadExampleScene, loadScene, startShow, pauseShow, stopShow, tickShow,
  fireCue, saveShow, restoreShow, askShow, setKeyframe, timelineRows, CX_NOTE
} from "../shared/show-session.js";

const SAVE_KEY = "nvd.show.save";
let session = loadExampleScene();
let timer = 0;

const $ = id => document.getElementById(id);

function paint() {
  $("sceneName").textContent = session.sceneName || "Scène";
  $("clock").textContent = session.time.toFixed(2) + " s";
  $("runState").textContent = !session.running ? "Arrêt" : session.paused ? "Pause" : "Lecture";
  const node = session.project.nodes[0];
  $("bound").textContent = node ? `${node.title || node.type} · opacité ${Number(node.params?.opacity ?? 1).toFixed(2)}` : "Aucun node";
  $("timeline").textContent = timelineRows(session).map(row => {
    if (row.kind === "curve") return `courbe ${row.label} · ${row.keys.map(key => key.time + ":" + key.value + " " + key.ease).join(" → ")}`;
    return `${row.kind} ${row.number || ""} ${row.label || row.id} · ${row.time ?? 0}s`;
  }).join("\n");
  $("cxNote").textContent = CX_NOTE;
}

function remember() {
  localStorage.setItem(SAVE_KEY, saveShow(session));
}

$("openFile").onchange = async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  session = restoreShow(await file.text());
  loadScene(session);
  paint();
};

$("loadScene").onclick = () => { loadScene(session); paint(); };
$("start").onclick = () => { startShow(session); paint(); };
$("pause").onclick = () => { pauseShow(session); paint(); };
$("stop").onclick = () => { stopShow(session); paint(); };
$("go").onclick = () => {
  const result = fireCue(session);
  $("log").textContent = result.ok ? `Cue ${result.cue?.label || ""}` : (result.error || "cue refusée");
  remember();
  paint();
};
$("save").onclick = () => {
  const text = saveShow(session);
  localStorage.setItem(SAVE_KEY, text);
  const blob = new Blob([text], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = (session.project.name || "show") + ".cvd.json";
  link.click();
  URL.revokeObjectURL(link.href);
};
$("restore").onclick = () => {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) { $("log").textContent = "Aucune sauvegarde Show"; return; }
  session = restoreShow(saved);
  loadScene(session);
  paint();
};
$("ask").onclick = () => {
  const text = $("chat").value.trim();
  if (!text) return;
  const result = askShow(session, text);
  $("log").textContent = result.ok
    ? `${result.added} node(s) · ${result.note}`
    : `${result.error || "aucune opération"} · ${result.note}`;
  remember();
  paint();
};
$("chat").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("ask").click(); }
});
$("addKey").onclick = () => {
  const node = session.project.nodes[0];
  if (!node) { $("log").textContent = "Aucun node à animer"; return; }
  setKeyframe(session.project, node.id, "opacity", Number($("keyTime").value) || 0, Number($("keyValue").value), $("keyEase").value);
  remember();
  paint();
};

timer = setInterval(() => {
  const before = session.time;
  tickShow(session, 0.1);
  if (session.time !== before) paint();
}, 100);

const saved = localStorage.getItem(SAVE_KEY);
if (saved) {
  try { session = restoreShow(saved); loadScene(session); } catch { session = loadExampleScene(); }
}
paint();
