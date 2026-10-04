/**
 * État réel de la fondation V1. Aucun libellé TESTED sans une observation dans cette suite.
 * libpd est le moteur audio embarqué, pas le graphe et pas l'interface.
 */
export const FOUNDATION_STATUS = Object.freeze({
  "audio/libpd": {
    status: "PARTIAL",
    detail: "Le wasm ouvre un patch et a renvoyé le float 42. Le buffer dac~ est resté silencieux, donc libpd n'est pas encore la sortie audio."
  },
  video: { status: "TESTED", detail: "Les rasters p5/Processing, transform et effets de scène produisent des pixels dans les tests." },
  "GPU/WebGL": { status: "TESTED", detail: "Chrome a compilé un fragment et relu un pixel." },
  shaders: { status: "TESTED", detail: "Le node shader exécute du GLSL WebGL1 vérifié." },
  particles: { status: "IMPLEMENTED", detail: "Les nodes particule, swarm et flow ont un processeur. La chaîne micro vers particules n'a pas été mesurée." },
  camera: { status: "PARTIAL", detail: "Le node caméra existe. Aucune image caméra n'a été lue dans cette passe." },
  WebRTC: { status: "PARTIAL", detail: "Remote Camera a un protocole. Aucun pair WebRTC n'a été négocié ici." },
  NDI: { status: "ABSTRACTION ONLY", detail: "ndi-out annonce un relais natif et n'émet pas de NDI. Pas de node d'entrée NDI." },
  OSC: { status: "PARTIAL", detail: "Un paquet OSC stop est bien sorti en UDP de test. La chaîne OSC vers audio n'a pas été jouée." },
  MIDI: { status: "PARTIAL", detail: "Le node MIDI lit lastMidi. Aucun CC matériel n'a été reçu." },
  DMX: { status: "PARTIAL", detail: "Le node DMX prépare un envoi. Aucun projecteur n'a répondu." },
  "Art-Net": { status: "TESTED", detail: "Le blackout Art-Net a quitté la machine et a été relu sur UDP local." },
  sACN: { status: "PARTIAL", detail: "Le paquet E1.31 est encodé. Aucune console sACN n'a été pilotée." },
  sensors: { status: "PARTIAL", detail: "Sans bus, le node capteur dit indisponible et ne publie pas de mesure." },
  Arduino: { status: "ABSTRACTION ONLY", detail: "Commande série seulement si le bus est en ligne. Aucune carte branchée." },
  ESP32: { status: "ABSTRACTION ONLY", detail: "Même pont série que l'Arduino. Aucun ESP32 vu." },
  Bluetooth: { status: "PARTIAL", detail: "Le node lit le bus capteur. Aucun périphérique Bluetooth n'a été ouvert." },
  GPIO: { status: "NOT SUPPORTED ON CURRENT PLATFORM", detail: "Pas de node GPIO. Rien n'a été inventé." },
  network: { status: "PARTIAL", detail: "Le node Wi-Fi attend une lecture réelle. Pas de scan réseau dans cette passe." },
  files: { status: "TESTED", detail: "Le store projet fait un aller-retour. Ce n'est pas un montage de média externe." },
  API: { status: "PARTIAL", detail: "L'IA locale est optionnelle. Le planner déterministe n'appelle pas d'API." },
  "time/clock/LFO": { status: "TESTED", detail: "Le node automation produit un nombre à partir du temps." },
  envelope: { status: "NOT SUPPORTED ON CURRENT PLATFORM", detail: "Pas de node enveloppe dans le catalogue." },
  trigger: { status: "IMPLEMENTED", detail: "Des ports trigger existent. Aucune chaîne trigger complète n'a été la preuve de cette passe." },
  sequencer: { status: "TESTED", detail: "Les tests de show chargent une scène et tirent un cue sur un node." },
  mapping: { status: "TESTED", detail: "Le processeur mapping a passé son test unitaire." },
  "audio analysis": { status: "PARTIAL", detail: "Le node FFT interroge Web Audio. Sans moteur audio il échoue, il n'invente pas un spectre." },
  "video analysis": { status: "IMPLEMENTED", detail: "Présence et flux optique ont des processeurs. Pas de mesure caméra réelle ici." },
  data: { status: "TESTED", detail: "Nombre, addition et multiplication sont évalués." }
});

export const FOUNDATION_CHAINS = Object.freeze({
  "audio to data to video": "NOT TESTED",
  "video to data to audio": "NOT TESTED",
  "beat to DMX": "NOT TESTED",
  "camera to shader": "CONNECTED",
  "MIDI to video": "NOT TESTED",
  "OSC to audio": "NOT TESTED",
  "Arduino/ESP32 to video": "NOT TESTED",
  "NDI in to shader to NDI out": "NOT SUPPORTED ON CURRENT PLATFORM",
  "sentence to graph to validate to RUN": "PARTIAL"
});
