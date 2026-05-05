(ns sena.chat.api
  (:require [clj-http.client :as http]
            [cheshire.core   :as json]))

(def ^:private endpoint "https://api.anthropic.com/v1/messages")
(def ^:private default-model "claude-sonnet-4-6")

(defn- api-key []
  (or (System/getenv "ANTHROPIC_API_KEY")
      (throw (ex-info "ANTHROPIC_API_KEY is not set" {}))))

(defn- model []
  (or (System/getenv "ANTHROPIC_MODEL")
      default-model))

(defn send-message
  "Call the Anthropic Messages API.
   system-prompt  — string
   messages       — [{:role \"user\" :content \"…\"} …]
   Returns the assistant reply string or throws."
  [system-prompt messages]
  (let [body     (json/generate-string
                   {:model      (model)
                    :max_tokens 1024
                    :system     system-prompt
                    :messages   (vec messages)})
        response (http/post endpoint
                   {:headers         {"x-api-key"         (api-key)
                                      "anthropic-version" "2023-06-01"
                                      "content-type"      "application/json"}
                    :body            body
                    :throw-exceptions false})]
    (if (= 200 (:status response))
      (-> response
          :body
          (json/parse-string true)
          :content
          first
          :text)
      (throw (ex-info "Anthropic API error"
                      {:status (:status response)
                       :body   (:body response)})))))
