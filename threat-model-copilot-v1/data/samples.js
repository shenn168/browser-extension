window.SampleScenarios = [
  {
    title: "SaaS Customer Portal",
    productType: "Web application + APIs",
    businessPurpose: "Customer self-service account and billing portal",
    usersActors: "Customers, support agents, admins",
    sensitiveAssets: "PII, billing records, session tokens",
    interfaces: "Web UI, REST API, payment gateway",
    deployment: "Public cloud",
    aiUsage: "None",
    vehicleConnectivity: "None",
    externalDependencies: "Payment processor, email provider",
    freeTextDescription:
      "A public web portal allows users to login, manage subscriptions, update payment methods, and download invoices."
  },
  {
    title: "RAG Support Assistant",
    productType: "AI chatbot",
    businessPurpose: "Support assistant for internal and customer-facing knowledge retrieval",
    usersActors: "Employees, customers, admins",
    sensitiveAssets: "Internal documents, embeddings, chat history, API keys",
    interfaces: "Web app, vector DB, model API",
    deployment: "Cloud-hosted",
    aiUsage: "RAG, prompt templates, tool use for ticket lookup",
    vehicleConnectivity: "None",
    externalDependencies: "LLM API, vector database",
    freeTextDescription:
      "The assistant answers user questions using retrieved enterprise knowledge and can call support tools to fetch ticket details."
  },
  {
    title: "Agentic Workflow Assistant",
    productType: "Agentic AI system",
    businessPurpose: "Automates multi-step business tasks with tool calling",
    usersActors: "Employees, admins",
    sensitiveAssets: "Internal systems access, customer data, workflow credentials",
    interfaces: "Web app, workflow APIs, file storage",
    deployment: "Hybrid cloud",
    aiUsage: "Agent planning, memory, plugins, tool execution",
    vehicleConnectivity: "None",
    externalDependencies: "Identity provider, model API, internal tools",
    freeTextDescription:
      "An internal agent receives goals, plans task execution, calls tools, reads files, and updates business records."
  },
  {
    title: "Connected Vehicle Telematics Platform",
    productType: "Connected vehicle backend + mobile app + OTA",
    businessPurpose: "Vehicle telemetry, fleet management, remote commands, OTA updates",
    usersActors: "Drivers, fleet operators, service technicians, admins",
    sensitiveAssets: "Vehicle identifiers, telemetry, credentials, firmware packages, remote command channels",
    interfaces: "Vehicle telematics unit, backend APIs, mobile app, OTA service",
    deployment: "Cloud backend with connected vehicles",
    aiUsage: "Anomaly detection for fleet telemetry",
    vehicleConnectivity: "Cellular, Bluetooth, OTA, service diagnostics",
    externalDependencies: "Cloud provider, mobile push provider, supplier firmware pipeline",
    freeTextDescription:
      "A connected vehicle platform collects telemetry, allows remote diagnostics and remote functions, and distributes OTA software updates."
  }
];