(ns sena.chat.core
  (:require [sena.chat.graph   :as graph]
            [sena.chat.api     :as api]
            [sena.chat.voices  :as voices]
            [sena.chat.session :as session]
            [clojure.string    :as str])
  (:gen-class))

;;; ── Display ──────────────────────────────────────────────────────────────────

(defn- print-summary [gs]
  (let [{:keys [node-count edge-count active-voice session-id version]}
        (graph/summary gs)]
    (println (str "\n  nodes=" node-count
                  "  edges=" edge-count
                  "  voice=" (name active-voice)
                  "  session=" session-id
                  "  v" version))))

(defn- print-banner []
  (println)
  (println "╔══════════════════════════════════════╗")
  (println "║   Sena Chat  ·  Clojure × Claude     ║")
  (println "╚══════════════════════════════════════╝")
  (println "  /voice <aria|nova|vex|grant>  — switch persona")
  (println "  /quit                          — exit")
  (println))

;;; ── Turn processing ──────────────────────────────────────────────────────────

(defn- process-turn
  "Add user message, call Claude, add assistant reply, persist. Returns new gs."
  [gs user-input session-id]
  (let [active-voice  (get-in gs [:graph :active-voice])
        system-prompt (voices/system-prompt active-voice)
        parent-id     (graph/last-node-id gs)
        gs            (graph/add-message gs :user user-input {:parent parent-id})
        user-msg-id   (graph/last-node-id gs)
        messages      (graph/messages-for-api gs)]
    (print "\nAssistant: ")
    (flush)
    (let [reply (api/send-message system-prompt messages)
          gs    (-> gs
                    (graph/add-message :assistant reply {:parent user-msg-id})
                    (session/save session-id))]
      (println reply)
      (print-summary gs)
      gs)))

;;; ── Command dispatch ─────────────────────────────────────────────────────────

(defn- handle-input
  "Dispatch a raw input line. Returns [continue? new-gs]."
  [gs session-id raw]
  (let [line (str/trim raw)]
    (cond
      (= "/quit" line)
      [false gs]

      (str/starts-with? line "/voice ")
      (let [v (-> line (subs 7) str/trim str/lower-case keyword)]
        (if (contains? voices/voices v)
          (let [gs (-> gs
                       (graph/switch-voice v)
                       (session/save session-id))]
            (println (str "Voice switched to " (name v) "."))
            [true gs])
          (do (println "Unknown voice. Options: aria  nova  vex  grant")
              [true gs])))

      (str/blank? line)
      [true gs]

      :else
      [true (process-turn gs line session-id)])))

;;; ── REPL loop ────────────────────────────────────────────────────────────────

(defn- run-loop [gs session-id]
  (loop [gs gs]
    (print "\nYou: ")
    (flush)
    (let [line (read-line)]
      (if (nil? line)
        (println "\nBye.")
        (let [[continue? new-gs] (handle-input gs session-id line)]
          (when continue?
            (recur new-gs)))))))

;;; ── Session selection ────────────────────────────────────────────────────────

(defn- start-new-session []
  (let [sid (session/new-session-id)
        gs  (-> (graph/new-graph)
                (assoc-in [:meta :session-id] sid))]
    (println (str "New session: " sid))
    [gs sid]))

(defn- prompt-session-choice []
  (let [sessions (session/list-sessions)]
    (if (seq sessions)
      (do
        (println "Available sessions:")
        (doseq [[i s] (map-indexed vector sessions)]
          (println (str "  [" i "] " s)))
        (println "  [n] Start new session")
        (print "Choose: ")
        (flush)
        (let [choice (str/trim (or (read-line) "n"))]
          (if (= "n" choice)
            (start-new-session)
            (let [idx (try (Integer/parseInt choice) (catch Exception _ nil))]
              (if (and idx (< idx (count sessions)))
                (let [sid (nth sessions idx)
                      gs  (session/load-session sid)]
                  (println (str "Resuming " sid))
                  (print-summary gs)
                  [gs sid])
                (do (println "Invalid choice — starting new session.")
                    (start-new-session)))))))
      (start-new-session))))

;;; ── Entry point ──────────────────────────────────────────────────────────────

(defn -main [& _args]
  (print-banner)
  (let [[gs sid] (prompt-session-choice)]
    (run-loop gs sid)
    (System/exit 0)))
