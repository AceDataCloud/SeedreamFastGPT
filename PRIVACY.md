# Privacy

This plugin runs inside the FastGPT Plugin service. It sends the selected inputs and application API key over HTTPS to api.acedata.cloud to submit one generation. The retrieval tool sends only the existing task ID and the same key. The plugin has no separate telemetry endpoint or persistent storage.

FastGPT stores the key through its plugin secret configuration. Do not put keys in prompts, workflow exports, screenshots, or support requests. Request records follow the [Ace Data Cloud privacy terms](https://platform.acedata.cloud/privacy).
