(ns sena.chat.session
  (:require [clojure.edn      :as edn]
            [clojure.java.io  :as io]
            [clojure.string   :as str])
  (:import [java.time LocalDateTime]
           [java.time.format DateTimeFormatter]))

(def ^:private sessions-dir "./sessions")

(defn- ensure-dir []
  (let [d (io/file sessions-dir)]
    (when-not (.exists d) (.mkdirs d))))

;;; ── Session IDs ──────────────────────────────────────────────────────────────

(defn new-session-id []
  (let [fmt (DateTimeFormatter/ofPattern "yyyyMMdd-HHmmss")]
    (.format (LocalDateTime/now) fmt)))

;;; ── Paths ────────────────────────────────────────────────────────────────────

(defn- current-path [session-id]
  (str sessions-dir "/" session-id ".edn"))

(defn- snapshot-path [session-id version]
  (str sessions-dir "/" session-id "_v" version ".edn"))

;;; ── Persistence ──────────────────────────────────────────────────────────────

(defn save
  "Persist graph-state to disk.
   Writes {session}.edn (latest) and {session}_v{n}.edn (immutable snapshot).
   Snapshots are never overwritten. Returns the updated graph-state."
  [gs session-id]
  (ensure-dir)
  (let [gs      (update-in gs [:meta :version] (fnil inc 0))
        version (get-in gs [:meta :version])
        snap    (snapshot-path session-id version)
        current (current-path  session-id)]
    (when-not (.exists (io/file snap))
      (spit snap (pr-str gs)))
    (spit current (pr-str gs))
    gs))

(defn load-session
  "Deserialize a session from disk. Returns nil if not found."
  [session-id]
  (let [f (io/file (current-path session-id))]
    (when (.exists f)
      (edn/read-string (slurp f)))))

(defn list-sessions
  "Return sorted list of session IDs found on disk (no snapshot suffixes)."
  []
  (ensure-dir)
  (->> (file-seq (io/file sessions-dir))
       (filter (fn [f]
                 (and (.isFile f)
                      (str/ends-with? (.getName f) ".edn")
                      (not (re-find #"_v\d+\.edn$" (.getName f))))))
       (map #(str/replace (.getName %) #"\.edn$" ""))
       sort))
