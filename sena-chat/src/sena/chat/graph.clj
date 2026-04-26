(ns sena.chat.graph
  (:import [java.time Instant]))

;;; ── Construction ─────────────────────────────────────────────────────────────

(defn new-graph
  "Return a blank conversation graph wrapped with bookkeeping meta."
  []
  {:graph {:nodes        {}
           :edges        []
           :root         nil
           :active-voice :aria}
   :meta  {:msg-counter 0
           :rel-counter 0
           :version     0}})

;;; ── ID helpers ───────────────────────────────────────────────────────────────

(defn- peek-msg-id [gs]
  (format "msg-%04d" (inc (get-in gs [:meta :msg-counter]))))

(defn- peek-rel-id [gs]
  (format "rel-%04d" (inc (get-in gs [:meta :rel-counter]))))

;;; ── Pure graph operations ────────────────────────────────────────────────────

(defn add-message
  "Append a message node and optional :reply-to edge.
   Returns the updated graph-state."
  [gs role content {:keys [parent voice]}]
  (let [msg-id (peek-msg-id gs)
        active-voice (get-in gs [:graph :active-voice])
        node   (cond-> {:id        msg-id
                        :role      role
                        :content   content
                        :timestamp (str (Instant/now))
                        :voice     (or voice active-voice)}
                 parent (assoc :parent parent))
        gs     (-> gs
                   (assoc-in  [:graph :nodes msg-id] node)
                   (update-in [:meta :msg-counter] inc)
                   (cond-> (nil? (get-in gs [:graph :root]))
                     (assoc-in [:graph :root] msg-id)))]
    (if parent
      (let [rel-id (peek-rel-id gs)
            edge   {:id     rel-id
                    :type   :reply-to
                    :source msg-id
                    :target parent}]
        (-> gs
            (update-in [:graph :edges] conj edge)
            (update-in [:meta :rel-counter] inc)))
      gs)))

(defn switch-voice
  "Update the active-voice attribute and record a :voice-switch edge.
   Conversation nodes are NOT reset."
  [gs new-voice]
  (let [rel-id   (peek-rel-id gs)
        old-voice (get-in gs [:graph :active-voice])
        edge     {:id   rel-id
                  :type :voice-switch
                  :from old-voice
                  :to   (keyword new-voice)}]
    (-> gs
        (update-in [:graph :edges] conj edge)
        (update-in [:meta :rel-counter] inc)
        (assoc-in  [:graph :active-voice] (keyword new-voice)))))

;;; ── Query helpers ────────────────────────────────────────────────────────────

(defn nodes-in-order
  "Return message nodes sorted by their monotonic ID."
  [gs]
  (let [nodes (get-in gs [:graph :nodes])]
    (sort-by :id (vals nodes))))

(defn last-node-id
  "Return the ID of the most recently added message node, or nil."
  [gs]
  (some-> (nodes-in-order gs) last :id))

(defn messages-for-api
  "Build the [{:role … :content …}] vector Claude's API expects."
  [gs]
  (map (fn [n] {:role (name (:role n)) :content (:content n)})
       (nodes-in-order gs)))

(defn summary
  "Return a display-friendly summary map of the current graph."
  [gs]
  {:node-count   (count (get-in gs [:graph :nodes]))
   :edge-count   (count (get-in gs [:graph :edges]))
   :active-voice (get-in gs [:graph :active-voice])
   :session-id   (get-in gs [:meta :session-id] "?")
   :version      (get-in gs [:meta :version] 0)})
