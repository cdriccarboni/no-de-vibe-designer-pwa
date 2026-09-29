/**
 * Capteurs réellement exposés par la plateforme.
 * Aucune valeur n'est inventée : API absente → erreur explicite,
 * API présente sans mesure → lecture en attente.
 */

function hasWindow() {
  return typeof window !== "undefined";
}

export class SensorBus {
  constructor(onData = null) {
    this.readings = new Map();
    this.listeners = new Set();
    this.geoWatch = null;
    this.motionHandler = null;
    this.orientationHandler = null;
    if (onData) this.subscribe(onData);
    if (hasWindow()) this.probeStatic();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  snapshot() {
    return Object.fromEntries(this.readings);
  }

  get(key) {
    return this.readings.get(key) || {
      available: false,
      error: `${key} : aucune lecture capteur`
    };
  }

  set(key, reading) {
    this.readings.set(key, reading);
    this.emit();
  }

  probeStatic() {
    const motion = typeof DeviceMotionEvent !== "undefined";
    const orientation = typeof DeviceOrientationEvent !== "undefined";
    this.set("gyro", motion
      ? { available: true, pending: true, value: null }
      : { available: false, error: "Gyroscope : DeviceMotionEvent indisponible sur cette plateforme" });
    this.set("accelerometer", motion
      ? { available: true, pending: true, value: null }
      : { available: false, error: "Accéléromètre : DeviceMotionEvent indisponible sur cette plateforme" });
    this.set("orientation", orientation
      ? { available: true, pending: true, value: null }
      : { available: false, error: "Orientation : DeviceOrientationEvent indisponible sur cette plateforme" });

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this.set("gps", { available: false, error: "GPS indisponible sur cette plateforme" });
    } else if (!this.readings.get("gps")?.value) {
      this.set("gps", { available: true, pending: true, value: null });
    }

    const vibrateOk = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
    this.set("haptics", vibrateOk
      ? { available: true, value: { ready: true } }
      : { available: false, error: "Vibration indisponible sur cette plateforme" });

    const conn = typeof navigator !== "undefined" ? navigator.connection : null;
    const onlineKnown = typeof navigator !== "undefined" && typeof navigator.onLine === "boolean";
    if (!onlineKnown && !conn) {
      this.set("wifi", { available: false, error: "Réseau : navigator.onLine et Network Information sont indisponibles" });
    } else {
      this.refreshNetwork();
    }

    const bt = typeof navigator !== "undefined" && navigator.bluetooth;
    this.set("bluetooth", bt
      ? { available: true, pending: true, value: null }
      : { available: false, error: "Bluetooth Web indisponible sur cette plateforme" });

    if (!this.readings.has("touch")) {
      this.set("touch", { available: true, pending: true, value: null });
    }
    if (!this.readings.has("multitouch")) {
      this.set("multitouch", { available: true, pending: true, value: null });
    }
    if (!this.readings.has("phone-mic")) {
      const mic = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
      this.set("phone-mic", mic
        ? { available: true, pending: true, value: null }
        : { available: false, error: "Micro : getUserMedia indisponible sur cette plateforme" });
    }
  }

  refreshNetwork() {
    if (typeof navigator === "undefined") {
      this.set("wifi", { available: false, error: "Réseau indisponible hors navigateur" });
      return;
    }
    const conn = navigator.connection || null;
    const value = {
      online: navigator.onLine ? 1 : 0,
      type: conn?.type || conn?.effectiveType || null,
      rtt: Number.isFinite(conn?.rtt) ? conn.rtt : null
    };
    const detailError = conn
      ? (value.type ? null : "Wi-Fi : le navigateur ne fournit pas le type de lien ni le SSID")
      : "Wi-Fi : API Network Information indisponible — seul l'état en ligne est une mesure réelle";
    this.set("wifi", { available: true, value, detailError });
  }

  noteTouch(points) {
    const list = Array.isArray(points) ? points.filter(p => p && typeof p.x === "number") : [];
    if (!list.length) {
      this.set("touch", { available: true, pending: true, value: null });
      this.set("multitouch", { available: true, pending: true, value: null });
      return;
    }
    const p = list[0];
    this.set("touch", { available: true, value: { x: p.x, y: p.y, pressure: p.pressure ?? 0 } });
    let gesture = "point";
    if (list.length >= 2) gesture = "pinch";
    this.set("multitouch", { available: true, value: { count: list.length, gesture } });
  }

  async requestMotion() {
    if (typeof DeviceMotionEvent === "undefined") {
      const error = "Gyroscope : DeviceMotionEvent indisponible sur cette plateforme";
      this.set("gyro", { available: false, error });
      this.set("accelerometer", { available: false, error: "Accéléromètre : DeviceMotionEvent indisponible sur cette plateforme" });
      throw new Error(error);
    }
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== "granted") {
        const error = "Permission mouvement refusée";
        this.set("gyro", { available: false, error });
        this.set("accelerometer", { available: false, error });
        throw new Error(error);
      }
    }
    if (this.motionHandler) window.removeEventListener("devicemotion", this.motionHandler);
    this.motionHandler = (e) => {
      const acc = e.accelerationIncludingGravity;
      const rot = e.rotationRate;
      if (!acc && !rot) return;
      this.set("accelerometer", {
        available: true,
        value: { x: acc?.x ?? null, y: acc?.y ?? null, z: acc?.z ?? null }
      });
      this.set("gyro", {
        available: true,
        value: { alpha: rot?.alpha ?? null, beta: rot?.beta ?? null, gamma: rot?.gamma ?? null }
      });
    };
    window.addEventListener("devicemotion", this.motionHandler);
  }

  async requestOrientation() {
    if (typeof DeviceOrientationEvent === "undefined") {
      const error = "Orientation : DeviceOrientationEvent indisponible sur cette plateforme";
      this.set("orientation", { available: false, error });
      throw new Error(error);
    }
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== "granted") {
        const error = "Permission orientation refusée";
        this.set("orientation", { available: false, error });
        throw new Error(error);
      }
    }
    if (this.orientationHandler) window.removeEventListener("deviceorientation", this.orientationHandler);
    this.orientationHandler = (e) => {
      if (e.alpha == null && e.beta == null && e.gamma == null) return;
      const angle = typeof screen !== "undefined" && screen.orientation && Number.isFinite(screen.orientation.angle)
        ? screen.orientation.angle
        : (e.gamma ?? 0);
      const portrait = Math.abs(angle) % 180 < 45 || Math.abs(angle) % 180 > 135;
      this.set("orientation", {
        available: true,
        value: { portrait: portrait ? 1 : 0, landscape: portrait ? 0 : 1, angle }
      });
    };
    window.addEventListener("deviceorientation", this.orientationHandler);
  }

  requestGPS() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const error = "GPS indisponible sur cette plateforme";
      this.set("gps", { available: false, error });
      throw new Error(error);
    }
    if (this.geoWatch != null) navigator.geolocation.clearWatch(this.geoWatch);
    this.geoWatch = navigator.geolocation.watchPosition(
      (p) => {
        this.set("gps", {
          available: true,
          value: { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }
        });
      },
      (err) => {
        const error = `GPS : ${err?.message || "indisponible"}`;
        this.set("gps", { available: false, error });
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  }

  async requestBluetooth() {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      const error = "Bluetooth Web indisponible sur cette plateforme";
      this.set("bluetooth", { available: false, error });
      throw new Error(error);
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      this.set("bluetooth", {
        available: true,
        value: { device: device.name || device.id || "appareil", service: null, characteristic: null }
      });
      return device;
    } catch (e) {
      const error = `Bluetooth : ${e?.message || e}`;
      this.set("bluetooth", { available: false, error });
      throw new Error(error);
    }
  }

  markMic(reading) {
    this.set("phone-mic", reading);
  }

  vibrate(pattern = 40) {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      const error = "Vibration indisponible sur cette plateforme";
      this.set("haptics", { available: false, error });
      return { ok: false, error };
    }
    const ok = navigator.vibrate(pattern);
    if (!ok) {
      const error = "Vibration refusée par le navigateur";
      this.set("haptics", { available: false, error });
      return { ok: false, error };
    }
    this.set("haptics", { available: true, value: { ready: true, pattern } });
    return { ok: true };
  }

  stop() {
    if (this.geoWatch != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatch);
    }
    this.geoWatch = null;
    if (this.motionHandler) window.removeEventListener("devicemotion", this.motionHandler);
    if (this.orientationHandler) window.removeEventListener("deviceorientation", this.orientationHandler);
    this.motionHandler = null;
    this.orientationHandler = null;
  }
}

/** Compatibilité : même classe que le bus capteurs. */
export class MobileSensors extends SensorBus {}
