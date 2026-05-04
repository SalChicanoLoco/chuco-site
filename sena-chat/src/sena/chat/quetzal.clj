(ns sena.chat.quetzal
  (:require [clojure.string :as str]))

(def canonical-name "Quetzal Core")
(def canonical-id :quetzal-core)
(def version "0.1.0")

(def aliases
  #{"quetzal" "quetzal core" "quetzal-core"
    "quetzl" "quetzl core" "quetzl-core"})

(def principles
  [{:id :single-core
    :name "Single canonical core"
    :summary "Quetzal Core is one shared coordination substrate, not multiple competing agent instances."}
   {:id :swarm-time
    :name "Swarm-time behavior"
    :summary "Agent activity is modeled as coordinated turns, pulses, and handoffs instead of isolated one-off replies."}
   {:id :memristor-memory
    :name "Memristor memory"
    :summary "Repeated paths become stronger through use; dormant paths fade without being erased."}
   {:id :isomorphic-agents
    :name "Isomorphic agents"
    :summary "Agents can share a common graph shape while keeping distinct voices, roles, and permissions."}])

(defn normalize-name
  "Collapse known spellings/abstractions onto the canonical Quetzal Core id."
  [value]
  (let [normalized (some-> value str str/trim str/lower-case (str/replace #"\s+" " "))]
    (when (contains? aliases normalized)
      canonical-id)))

(defn canonical?
  "True when value is one of the accepted names for Quetzal Core."
  [value]
  (= canonical-id (normalize-name value)))

(defn status
  "Return the canonical Quetzal Core contract for callers that need metadata."
  []
  {:id canonical-id
   :name canonical-name
   :version version
   :aliases (sort aliases)
   :principles principles})

(defn status-lines
  "Human-readable Quetzal Core status for the terminal UI."
  []
  (let [{:keys [name version principles]} (status)]
    (concat [(str name " · v" version)
             "Canonical rule: one core, many projections — no duplicate Quetzl/Quetzal instances."]
            (map (fn [{:keys [name summary]}]
                   (str "- " name ": " summary))
                 principles))))
