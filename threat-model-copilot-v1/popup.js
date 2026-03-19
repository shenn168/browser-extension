const STORAGE_KEY = "threat-modeler-assessments";

const state = {
  intake: createEmptyIntake(),
  questions: [],
  report: null,
  saved: []
};

function createEmptyIntake() {
  return {
    title: "",
    productType: "",
    businessPurpose: "",
    usersActors: "",
    sensitiveAssets: "",
    interfaces: "",
    deployment: "",
    aiUsage: "",
    vehicleConnectivity: "",
    externalDependencies: "",
    freeTextDescription: ""
  };
}

function createId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10);
}

function splitCsvish(value) {
  return (value || "")
    .split(/,|\n|;/g)
    .map(function (v) {
      return v.trim();
    })
    .filter(Boolean);
}

function containsAny(text, keywords) {
  const lower = String(text || "").toLowerCase();
  return keywords.some(function (k) {
    return lower.includes(String(k).toLowerCase());
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toSeverity(score) {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

function severityClass(severity) {
  return String(severity || "").toLowerCase();
}

function getIntakeFromForm() {
  return {
    title: document.getElementById("title").value.trim(),
    productType: document.getElementById("productType").value.trim(),
    businessPurpose: document.getElementById("businessPurpose").value.trim(),
    usersActors: document.getElementById("usersActors").value.trim(),
    sensitiveAssets: document.getElementById("sensitiveAssets").value.trim(),
    interfaces: document.getElementById("interfaces").value.trim(),
    deployment: document.getElementById("deployment").value.trim(),
    aiUsage: document.getElementById("aiUsage").value.trim(),
    vehicleConnectivity: document.getElementById("vehicleConnectivity").value.trim(),
    externalDependencies: document.getElementById("externalDependencies").value.trim(),
    freeTextDescription: document.getElementById("freeTextDescription").value.trim()
  };
}

function setFormFromIntake(intake) {
  document.getElementById("title").value = intake.title || "";
  document.getElementById("productType").value = intake.productType || "";
  document.getElementById("businessPurpose").value = intake.businessPurpose || "";
  document.getElementById("usersActors").value = intake.usersActors || "";
  document.getElementById("sensitiveAssets").value = intake.sensitiveAssets || "";
  document.getElementById("interfaces").value = intake.interfaces || "";
  document.getElementById("deployment").value = intake.deployment || "";
  document.getElementById("aiUsage").value = intake.aiUsage || "";
  document.getElementById("vehicleConnectivity").value = intake.vehicleConnectivity || "";
  document.getElementById("externalDependencies").value = intake.externalDependencies || "";
  document.getElementById("freeTextDescription").value = intake.freeTextDescription || "";
}

function clearForm() {
  state.intake = createEmptyIntake();
  state.questions = [];
  state.report = null;
  setFormFromIntake(state.intake);
  renderQuestions();
  renderReport();
  setView("intake");
}

function inferDomainsFromIntake(intake) {
  const joined = Object.values(intake).join(" ").toLowerCase();
  const domains = ["digital"];

  if (
    containsAny(joined, [
      "llm",
      "rag",
      "agent",
      "agentic",
      "prompt",
      "model",
      "embedding",
      "inference",
      "chatbot"
    ])
  ) {
    domains.push("ai");
  }

  if (
    containsAny(joined, [
      "vehicle",
      "ecu",
      "can",
      "ota",
      "telematics",
      "bluetooth",
      "diagnostics",
      "fleet",
      "v2x",
      "firmware",
      "automotive"
    ])
  ) {
    domains.push("vehicle");
  }

  return Array.from(new Set(domains));
}

function generateClarificationQuestions(intake, inferredDomains) {
  const questions = [];

  if (!intake.sensitiveAssets) {
    questions.push({
      id: createId("q"),
      prompt: "What are the most sensitive assets or data types involved?",
      reason: "Asset sensitivity strongly affects impact and disclosure risk.",
      field: "sensitiveAssets",
      answer: ""
    });
  }

  if (!intake.interfaces) {
    questions.push({
      id: createId("q"),
      prompt:
        "What interfaces or exposed entry points exist such as web UI, APIs, admin consoles, mobile apps, or device links?",
      reason: "Attack surface depends heavily on exposed interfaces.",
      field: "interfaces",
      answer: ""
    });
  }

  if (inferredDomains.includes("ai") && !intake.aiUsage) {
    questions.push({
      id: createId("q"),
      prompt:
        "How does the AI system operate such as RAG, tool use, memory, agents, fine-tuning, or model API access?",
      reason: "AI usage details determine relevant ATLAS and OWASP LLM threats.",
      field: "aiUsage",
      answer: ""
    });
  }

  if (inferredDomains.includes("vehicle") && !intake.vehicleConnectivity) {
    questions.push({
      id: createId("q"),
      prompt:
        "What vehicle connectivity and maintenance channels are present such as OTA, Bluetooth, telematics, diagnostics, V2X, or mobile pairing?",
      reason: "UN R155 relevance depends on connected interfaces and update paths.",
      field: "vehicleConnectivity",
      answer: ""
    });
  }

  if (!intake.externalDependencies) {
    questions.push({
      id: createId("q"),
      prompt:
        "Which external providers, suppliers, APIs, or infrastructure dependencies does the product rely on?",
      reason: "Third-party and supply-chain exposure may introduce additional attack vectors.",
      field: "externalDependencies",
      answer: ""
    });
  }

  return questions;
}

function makeFinding(partial) {
  const score = partial.likelihood * partial.impact;
  return {
    id: createId("finding"),
    title: partial.title,
    scenario: partial.scenario,
    affectedAssets: partial.affectedAssets,
    attackVectors: partial.attackVectors,
    domains: partial.domains,
    likelihood: partial.likelihood,
    impact: partial.impact,
    score: score,
    severity: toSeverity(score),
    recommendations: partial.recommendations,
    validationIdeas: partial.validationIdeas,
    frameworkRefs: partial.frameworkRefs
  };
}

function generateFindings(intake, inferredDomains) {
  const F = window.Frameworks;
  const text = Object.values(intake).join(" ").toLowerCase();
  const assets = splitCsvish(intake.sensitiveAssets || "system data, credentials, logs");
  const findings = [];

  if (containsAny(text, ["login", "admin", "portal", "account", "session", "token"])) {
    findings.push(
      makeFinding({
        title: "Authentication and authorization abuse",
        scenario:
          "Attackers may abuse weak authentication, session handling, or role controls to gain unauthorized access to user or administrative functions.",
        affectedAssets: assets,
        attackVectors: ["Credential stuffing", "Session abuse", "Privilege escalation", "Broken authorization"],
        domains: ["digital"],
        likelihood: 4,
        impact: 4,
        recommendations: [
          "Enforce MFA for privileged users and high-risk actions.",
          "Review object-level and function-level authorization paths.",
          "Harden session token handling and expiration.",
          "Create abuse-case stories for admin and support workflows."
        ],
        validationIdeas: [
          "Test broken object and function level authorization cases.",
          "Perform role-matrix review for admin, support, and end-user actions.",
          "Check session invalidation on logout and privilege change."
        ],
        frameworkRefs: [
          F.stride.spoofing,
          F.stride.elevationOfPrivilege,
          F.owaspTop10.brokenAccess,
          F.owaspTop10.idAuthFailures,
          F.owaspApi.api1,
          F.owaspApi.api5,
          F.mitreAttack.validAccounts,
          F.mitreAttack.bruteForce,
          F.nistCsf.protect
        ]
      })
    );
  }

  if (containsAny(text, ["api", "rest", "graphql", "backend", "public cloud", "web app"])) {
    findings.push(
      makeFinding({
        title: "Public-facing application and API exploitation",
        scenario:
          "Internet-reachable interfaces may be exploited through injection, weak validation, unsafe API consumption, or misconfiguration.",
        affectedAssets: assets,
        attackVectors: ["Injection", "Exposed admin endpoints", "SSRF", "Unsafe third-party API integration"],
        domains: ["digital"],
        likelihood: 4,
        impact: 3,
        recommendations: [
          "Document all internet-facing endpoints and administration paths.",
          "Add input validation and output encoding by interface type.",
          "Review API inventory, authentication paths, and backend trust assumptions.",
          "Apply secure configuration baselines and rate limiting."
        ],
        validationIdeas: [
          "Run API authorization and schema abuse tests.",
          "Test injection payloads across web and API inputs.",
          "Check for hidden or unprotected admin/debug endpoints."
        ],
        frameworkRefs: [
          F.stride.tampering,
          F.stride.informationDisclosure,
          F.owaspTop10.injection,
          F.owaspTop10.securityMisconfig,
          F.owaspTop10.ssrf,
          F.owaspApi.api8,
          F.owaspApi.api10,
          F.mitreAttack.exploitPublicApp,
          F.nistCsf.identify,
          F.nistCsf.protect
        ]
      })
    );
  }

  if (containsAny(text, ["rag", "prompt", "agent", "tool", "plugin", "embedding", "model", "chatbot"])) {
    findings.push(
      makeFinding({
        title: "Prompt injection and unsafe tool use in AI workflows",
        scenario:
          "User-controlled or retrieved content may manipulate model behavior, trigger unsafe tool actions, or bypass intended constraints.",
        affectedAssets: assets,
        attackVectors: ["Direct prompt injection", "Indirect prompt injection", "Tool misuse", "Overbroad agent permissions"],
        domains: ["ai", "digital"],
        likelihood: 4,
        impact: 5,
        recommendations: [
          "Separate instructions, retrieved content, and user content with strict trust boundaries.",
          "Require explicit policy checks before tool execution or sensitive actions.",
          "Minimize tool permissions and enforce allowlists per action.",
          "Add human approval for high-risk actions and sensitive data operations."
        ],
        validationIdeas: [
          "Test direct and indirect prompt injection scenarios.",
          "Attempt tool misuse through crafted retrieved documents and user prompts.",
          "Review whether model output can directly trigger privileged operations."
        ],
        frameworkRefs: [
          F.stride.tampering,
          F.stride.elevationOfPrivilege,
          F.owaspLlm.llm01,
          F.owaspLlm.llm07,
          F.owaspLlm.llm08,
          F.mitreAtlas.promptInjection,
          F.mitreAtlas.abuseApi,
          F.nistAiRmf.map,
          F.nistAiRmf.manage,
          F.nistCsf.protect
        ]
      })
    );
  }

  if (containsAny(text, ["rag", "embedding", "knowledge", "documents", "vector"])) {
    findings.push(
      makeFinding({
        title: "Knowledge base poisoning and sensitive retrieval exposure",
        scenario:
          "Compromised or untrusted content sources may poison retrieval results, leak sensitive information, or influence downstream AI decisions.",
        affectedAssets: assets,
        attackVectors: ["Poisoned source documents", "Embedding manipulation", "Unauthorized retrieval", "Sensitive data leakage"],
        domains: ["ai"],
        likelihood: 3,
        impact: 5,
        recommendations: [
          "Classify and curate knowledge sources before ingestion.",
          "Add content provenance and ingestion approval for sensitive corpora.",
          "Partition embeddings and retrieval access by trust level or tenant.",
          "Screen responses for sensitive content disclosure."
        ],
        validationIdeas: [
          "Inject malicious documents into a test corpus and observe downstream responses.",
          "Test tenant separation and access controls on vector retrieval.",
          "Attempt retrieval of restricted content with low-privilege identities."
        ],
        frameworkRefs: [
          F.stride.informationDisclosure,
          F.owaspLlm.llm04,
          F.owaspLlm.llm06,
          F.mitreAtlas.dataPoisoning,
          F.mitreAtlas.modelExfil,
          F.nistAiRmf.measure,
          F.nistAiRmf.manage
        ]
      })
    );
  }

  if (containsAny(text, ["vehicle", "telematics", "ota", "bluetooth", "diagnostics", "fleet", "firmware", "remote commands"])) {
    findings.push(
      makeFinding({
        title: "Connected vehicle interface compromise",
        scenario:
          "Attackers may target telematics, mobile pairing, service diagnostics, or remote command pathways to gain access to vehicle functions or data.",
        affectedAssets: assets,
        attackVectors: ["Telematics abuse", "Bluetooth abuse", "Diagnostic interface abuse", "Unauthorized remote command execution"],
        domains: ["vehicle", "digital"],
        likelihood: 4,
        impact: 5,
        recommendations: [
          "Enumerate all vehicle-facing and maintenance interfaces with trust boundaries.",
          "Require strong mutual authentication between vehicle, backend, and mobile clients.",
          "Limit remote commands to narrowly defined authorized actions.",
          "Separate safety-relevant functions from convenience and infotainment pathways."
        ],
        validationIdeas: [
          "Test remote command authorization and replay resistance.",
          "Review diagnostic and service access controls.",
          "Exercise abuse scenarios across telematics, mobile app, and backend channels."
        ],
        frameworkRefs: [
          F.stride.spoofing,
          F.stride.elevationOfPrivilege,
          F.unr155.externalInterfaces,
          F.unr155.unauthorizedAccess,
          F.unr155.backendThreats,
          F.unr155.availability,
          F.mitreAttack.validAccounts,
          F.nistCsf.identify,
          F.nistCsf.protect
        ]
      })
    );
  }

  if (containsAny(text, ["ota", "update", "firmware", "software package"])) {
    findings.push(
      makeFinding({
        title: "Software and firmware update manipulation",
        scenario:
          "If update pipelines or package validation are weak, attackers may tamper with software or firmware updates and distribute unauthorized code.",
        affectedAssets: assets,
        attackVectors: ["Unsigned updates", "Compromised update server", "Package tampering", "Rollback attacks"],
        domains: ["vehicle", "digital"],
        likelihood: 3,
        impact: 5,
        recommendations: [
          "Sign update artifacts and verify signature chains at installation time.",
          "Protect update metadata, anti-rollback controls, and release provenance.",
          "Review supplier access and update pipeline trust dependencies.",
          "Establish incident response procedures for compromised update infrastructure."
        ],
        validationIdeas: [
          "Test signature enforcement and rollback resistance.",
          "Simulate compromised update metadata and unauthorized package distribution.",
          "Review end-to-end provenance from build to deployment."
        ],
        frameworkRefs: [
          F.stride.tampering,
          F.owaspTop10.softwareIntegrity,
          F.unr155.updateManipulation,
          F.unr155.backendThreats,
          F.nistCsf.protect,
          F.nistCsf.respond
        ]
      })
    );
  }

  if (containsAny(text, ["sensor", "gps", "gnss", "camera", "signal", "v2x"])) {
    findings.push(
      makeFinding({
        title: "Sensor or signal manipulation affecting system decisions",
        scenario:
          "Manipulated sensor, position, or communications signals may degrade trust in system inputs and trigger unsafe or incorrect decisions.",
        affectedAssets: assets,
        attackVectors: ["GNSS spoofing", "Signal tampering", "Sensor input manipulation", "False telemetry injection"],
        domains: ["vehicle", "ai"],
        likelihood: 3,
        impact: 4,
        recommendations: [
          "Validate critical inputs using redundancy and plausibility checks.",
          "Treat externally influenced signals as untrusted until verified.",
          "Monitor for anomalous patterns in telemetry and sensor-derived decisions."
        ],
        validationIdeas: [
          "Perform spoofing and signal anomaly simulations.",
          "Test fallback behavior when signal trust is reduced or unavailable."
        ],
        frameworkRefs: [
          F.stride.tampering,
          F.unr155.sensorSignalManipulation,
          F.unr155.availability,
          F.nistCsf.detect,
          F.nistAiRmf.measure
        ]
      })
    );
  }

  if (!containsAny(text, ["logs", "monitoring", "alert", "incident"])) {
    findings.push(
      makeFinding({
        title: "Insufficient logging, monitoring, and incident visibility",
        scenario:
          "Weak security telemetry can delay detection of abuse, incident triage, and accountability across product, AI, or vehicle-connected workflows.",
        affectedAssets: assets,
        attackVectors: ["Undetected misuse", "Invisible privilege abuse", "Slow incident response"],
        domains: inferredDomains,
        likelihood: 3,
        impact: 3,
        recommendations: [
          "Define security events that must be logged across identities, data access, admin actions, model/tool actions, and update operations.",
          "Add alerting for anomalous access, repeated failures, policy bypasses, and sensitive actions.",
          "Ensure logs support investigation without exposing secrets."
        ],
        validationIdeas: [
          "Review audit coverage for high-risk actions.",
          "Tabletop an incident using available telemetry only."
        ],
        frameworkRefs: [
          F.stride.repudiation,
          F.owaspTop10.loggingFailures,
          F.nistCsf.detect,
          F.nistCsf.respond
        ]
      })
    );
  }

  findings.sort(function (a, b) {
    return b.score - a.score;
  });

  return findings;
}

function uniqueRefs(findings) {
  const map = {};
  findings.forEach(function (finding) {
    finding.frameworkRefs.forEach(function (ref) {
      map[ref.framework + "-" + ref.id] = ref;
    });
  });
  return Object.values(map);
}

function buildReport(intake, questions, inferredDomains, findings) {
  const keyAssets = splitCsvish(intake.sensitiveAssets || "credentials, business data, system interfaces");

  const trustBoundaries = [
    "User to front-end interface",
    "Front-end to backend/API",
    "Backend to third-party dependencies"
  ];

  if (inferredDomains.includes("ai")) {
    trustBoundaries.push("User input and retrieved content to model prompt assembly");
    trustBoundaries.push("Model output to tool execution or downstream actions");
  }

  if (inferredDomains.includes("vehicle")) {
    trustBoundaries.push("Vehicle interfaces to backend services");
    trustBoundaries.push("OTA/update infrastructure to in-vehicle software");
  }

  const criticalCount = findings.filter(function (f) {
    return f.severity === "Critical";
  }).length;

  const highCount = findings.filter(function (f) {
    return f.severity === "High";
  }).length;

  const mediumCount = findings.filter(function (f) {
    return f.severity === "Medium";
  }).length;

  const executiveSummary =
    "This assessment identified " +
    findings.length +
    " threat scenarios across " +
    inferredDomains.join(", ") +
    " domains, including " +
    criticalCount +
    " Critical, " +
    highCount +
    " High, and " +
    mediumCount +
    " Medium findings. The strongest priorities center on exposed interfaces, authorization paths, sensitive assets, and domain-specific risks such as AI tool misuse or connected vehicle interface compromise. This v1 report is intended to support product scoping, initial security review, and prioritization of next actions.";

  return {
    id: createId("report"),
    createdAt: new Date().toISOString(),
    title: intake.title || "Threat Analysis Report",
    executiveSummary: executiveSummary,
    scopeAssumptions: [
      "This assessment is generated from user-provided product context and rules-based mappings.",
      "Threat relevance increases when interfaces, assets, dependencies, and trust boundaries are clearly described.",
      "v1 is intended as a demonstration tool and not a substitute for a full architecture review or penetration test."
    ],
    keyAssets: keyAssets,
    trustBoundaries: trustBoundaries,
    findings: findings,
    productOwnerNextSteps: [
      "Confirm system scope, sensitive assets, and high-risk workflows.",
      "Prioritize the top findings into the next product security backlog.",
      "Clarify ownership for authentication, API exposure, AI safeguards, and update channels."
    ],
    securityEngineerNextSteps: [
      "Validate top-ranked findings through design review and targeted security testing.",
      "Map mitigation gaps to existing controls, SDLC checkpoints, and abuse-case tests.",
      "Create verification tasks for access control, logging, AI guardrails, and supply-chain protections."
    ],
    managementNextSteps: [
      "Review top risks and assign accountable owners.",
      "Decide which high-severity items require design changes before release.",
      "Track remediation readiness, residual risk, and reporting cadence."
    ],
    references: uniqueRefs(findings),
    intake: intake,
    questions: questions,
    inferredDomains: inferredDomains
  };
}

function enrichIntakeWithQuestionAnswers(intake, questions) {
  const merged = Object.assign({}, intake);

  questions.forEach(function (q) {
    if (q.answer && q.field && q.field !== "custom") {
      if (merged[q.field]) {
        merged[q.field] = merged[q.field] + "; " + q.answer;
      } else {
        merged[q.field] = q.answer;
      }
    }
  });

  return merged;
}

function renderBulletList(items) {
  return (
    "<ul>" +
    items
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("") +
    "</ul>"
  );
}

function renderQuestions() {
  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";

  if (!state.questions.length) {
    container.innerHTML = '<div class="empty-state">No clarification questions were generated. Continue to report.</div>';
    return;
  }

  state.questions.forEach(function (question, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "subcard";
    wrapper.innerHTML =
      "<div><strong>" +
      (index + 1) +
      ". " +
      escapeHtml(question.prompt) +
      "</strong></div>" +
      '<div class="muted" style="margin-top:6px;">Why it matters: ' +
      escapeHtml(question.reason) +
      "</div>" +
      '<textarea data-question-id="' +
      question.id +
      '" style="margin-top:8px;" placeholder="Optional answer">' +
      escapeHtml(question.answer || "") +
      "</textarea>";
    container.appendChild(wrapper);
  });

  Array.from(container.querySelectorAll("textarea")).forEach(function (textarea) {
    textarea.addEventListener("input", function (event) {
      const id = event.target.getAttribute("data-question-id");
      const match = state.questions.find(function (q) {
        return q.id === id;
      });
      if (match) {
        match.answer = event.target.value;
      }
    });
  });
}

function renderReport() {
  const container = document.getElementById("reportContainer");
  container.innerHTML = "";

  if (!state.report) {
    container.innerHTML = '<div class="empty-state">No report generated yet.</div>';
    return;
  }

  const report = state.report;

  const findingsHtml = report.findings
    .map(function (finding, index) {
      return (
        '<div class="subcard finding">' +
        '<div class="space-between">' +
        "<div><strong>" +
        (index + 1) +
        ". " +
        escapeHtml(finding.title) +
        "</strong></div>" +
        '<span class="badge ' +
        severityClass(finding.severity) +
        '">' +
        escapeHtml(finding.severity) +
        "</span>" +
        "</div>" +
        '<div class="row" style="margin-top:8px;">' +
        finding.domains
          .map(function (domain) {
            return '<span class="tag">' + escapeHtml(domain) + "</span>";
          })
          .join("") +
        '<span class="tag">Likelihood ' +
        escapeHtml(finding.likelihood) +
        "</span>" +
        '<span class="tag">Impact ' +
        escapeHtml(finding.impact) +
        "</span>" +
        '<span class="tag">Score ' +
        escapeHtml(finding.score) +
        "</span>" +
        "</div>" +
        "<p>" +
        escapeHtml(finding.scenario) +
        "</p>" +
        "<div><strong>Attack Vectors</strong></div>" +
        renderBulletList(finding.attackVectors) +
        "<div><strong>Recommendations</strong></div>" +
        renderBulletList(finding.recommendations) +
        "<div><strong>Validation Ideas</strong></div>" +
        renderBulletList(finding.validationIdeas) +
        "<div><strong>Framework Mappings</strong></div>" +
        '<div class="row" style="margin-top:8px;">' +
        finding.frameworkRefs
          .map(function (ref) {
            return '<span class="tag">' + escapeHtml(ref.framework) + " " + escapeHtml(ref.id) + "</span>";
          })
          .join("") +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  const referencesHtml = report.references
    .map(function (ref) {
      return "<li>" + escapeHtml(ref.framework) + " " + escapeHtml(ref.id) + ": " + escapeHtml(ref.title) + "</li>";
    })
    .join("");

  container.innerHTML =
    '<div class="report-section">' +
    "<h3>" +
    escapeHtml(report.title) +
    "</h3>" +
    '<div class="muted">Generated ' +
    escapeHtml(report.createdAt) +
    "</div>" +
    "<p>" +
    escapeHtml(report.executiveSummary) +
    "</p>" +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Scope and Assumptions</h3>" +
    renderBulletList(report.scopeAssumptions) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Key Assets</h3>" +
    renderBulletList(report.keyAssets) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Trust Boundaries</h3>" +
    renderBulletList(report.trustBoundaries) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Findings</h3>" +
    findingsHtml +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Next Steps for Product Owner</h3>" +
    renderBulletList(report.productOwnerNextSteps) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Next Steps for Security Engineer</h3>" +
    renderBulletList(report.securityEngineerNextSteps) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Next Steps for Management</h3>" +
    renderBulletList(report.managementNextSteps) +
    "</div>" +
    '<div class="report-section">' +
    "<h3>Reference Appendix</h3>" +
    "<ul>" +
    referencesHtml +
    "</ul>" +
    "</div>";
}

function renderSaved() {
  const container = document.getElementById("savedContainer");
  container.innerHTML = "";

  if (!state.saved.length) {
    container.innerHTML = '<div class="empty-state">No saved assessments yet.</div>';
    return;
  }

  state.saved.forEach(function (item) {
    const wrapper = document.createElement("div");
    wrapper.className = "subcard";
    wrapper.innerHTML =
      '<div class="space-between">' +
      "<div>" +
      "<div><strong>" +
      escapeHtml(item.title) +
      "</strong></div>" +
      '<div class="muted">' +
      escapeHtml(item.createdAt) +
      "</div>" +
      "</div>" +
      '<div class="actions" style="margin-top:0;">' +
      '<button data-load-id="' +
      item.id +
      '">Load</button>' +
      '<button data-delete-id="' +
      item.id +
      '">Delete</button>' +
      "</div>" +
      "</div>";
    container.appendChild(wrapper);
  });

  Array.from(container.querySelectorAll("[data-load-id]")).forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.getAttribute("data-load-id");
      const item = state.saved.find(function (entry) {
        return entry.id === id;
      });

      if (!item) return;

      state.intake = item.intake;
      state.questions = item.questions || [];
      state.report = item.report || null;

      setFormFromIntake(state.intake);
      renderQuestions();
      renderReport();
      setView("report");
    });
  });

  Array.from(container.querySelectorAll("[data-delete-id]")).forEach(function (button) {
    button.addEventListener("click", async function () {
      const id = button.getAttribute("data-delete-id");
      await deleteAssessment(id);
      await refreshSaved();
    });
  });
}

function setView(name) {
  ["intake", "questions", "report", "saved"].forEach(function (viewName) {
    document.getElementById("view-" + viewName).classList.toggle("active", viewName === name);
    document.getElementById("nav-" + viewName).classList.toggle("active", viewName === name);
  });
}

function reportToMarkdown(report) {
  const lines = [];

  lines.push("# " + report.title);
  lines.push("");
  lines.push("Generated: " + report.createdAt);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push(report.executiveSummary);
  lines.push("");
  lines.push("## Scope and Assumptions");
  report.scopeAssumptions.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## Key Assets");
  report.keyAssets.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## Trust Boundaries");
  report.trustBoundaries.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## Findings");

  report.findings.forEach(function (finding, index) {
    lines.push("### " + (index + 1) + ". " + finding.title);
    lines.push("- Severity: " + finding.severity);
    lines.push("- Likelihood: " + finding.likelihood);
    lines.push("- Impact: " + finding.impact);
    lines.push("- Score: " + finding.score);
    lines.push("- Scenario: " + finding.scenario);
    lines.push("- Affected Assets: " + finding.affectedAssets.join(", "));
    lines.push("- Attack Vectors:");
    finding.attackVectors.forEach(function (item) {
      lines.push("  - " + item);
    });
    lines.push("- Recommendations:");
    finding.recommendations.forEach(function (item) {
      lines.push("  - " + item);
    });
    lines.push("- Validation Ideas:");
    finding.validationIdeas.forEach(function (item) {
      lines.push("  - " + item);
    });
    lines.push("- References:");
    finding.frameworkRefs.forEach(function (ref) {
      lines.push("  - " + ref.framework + " " + ref.id + ": " + ref.title);
    });
    lines.push("");
  });

  lines.push("## Product Owner Next Steps");
  report.productOwnerNextSteps.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## Security Engineer Next Steps");
  report.securityEngineerNextSteps.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## Management Next Steps");
  report.managementNextSteps.forEach(function (item) {
    lines.push("- " + item);
  });
  lines.push("");
  lines.push("## References");
  report.references.forEach(function (ref) {
    lines.push("- " + ref.framework + " " + ref.id + ": " + ref.title);
  });

  return lines.join("\n");
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportReportJson() {
  if (!state.report) return;
  const filename = (state.report.title || "report").replace(/\s+/g, "-").toLowerCase() + "-report.json";
  downloadText(filename, JSON.stringify(state.report, null, 2), "application/json");
}

function exportReportMarkdown() {
  if (!state.report) return;
  const filename = (state.report.title || "report").replace(/\s+/g, "-").toLowerCase() + "-report.md";
  downloadText(filename, reportToMarkdown(state.report), "text/markdown");
}

function loadAssessments() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([STORAGE_KEY], function (result) {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

function saveAssessment(item) {
  return loadAssessments().then(function (current) {
    const next = [item].concat(
      current.filter(function (entry) {
        return entry.id !== item.id;
      })
    );

    return new Promise(function (resolve) {
      chrome.storage.local.set({ [STORAGE_KEY]: next }, function () {
        resolve();
      });
    });
  });
}

function deleteAssessment(id) {
  return loadAssessments().then(function (current) {
    const next = current.filter(function (entry) {
      return entry.id !== id;
    });

    return new Promise(function (resolve) {
      chrome.storage.local.set({ [STORAGE_KEY]: next }, function () {
        resolve();
      });
    });
  });
}

function refreshSaved() {
  return loadAssessments().then(function (items) {
    state.saved = items;
    renderSaved();
  });
}

function populateSamples() {
  const select = document.getElementById("sampleScenario");
  window.SampleScenarios.forEach(function (sample, index) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = sample.title;
    select.appendChild(option);
  });

  select.addEventListener("change", function () {
    const index = Number(select.value);
    if (!Number.isNaN(index) && window.SampleScenarios[index]) {
      state.intake = Object.assign({}, window.SampleScenarios[index]);
      setFormFromIntake(state.intake);
    }
  });
}

function bindNavigation() {
  document.getElementById("nav-intake").addEventListener("click", function () {
    setView("intake");
  });

  document.getElementById("nav-questions").addEventListener("click", function () {
    setView("questions");
  });

  document.getElementById("nav-report").addEventListener("click", function () {
    if (state.report) {
      setView("report");
    }
  });

  document.getElementById("nav-saved").addEventListener("click", function () {
    setView("saved");
  });
}

function bindActions() {
  document.getElementById("generateQuestionsBtn").addEventListener("click", function () {
    state.intake = getIntakeFromForm();
    const inferredDomains = inferDomainsFromIntake(state.intake);
    state.questions = generateClarificationQuestions(state.intake, inferredDomains);
    renderQuestions();
    setView("questions");
  });

  document.getElementById("backToIntakeBtn").addEventListener("click", function () {
    setView("intake");
  });

  document.getElementById("generateReportBtn").addEventListener("click", function () {
    state.intake = getIntakeFromForm();
    const enrichedIntake = enrichIntakeWithQuestionAnswers(state.intake, state.questions);
    const inferredDomains = inferDomainsFromIntake(enrichedIntake);
    const findings = generateFindings(enrichedIntake, inferredDomains);
    state.report = buildReport(enrichedIntake, state.questions, inferredDomains, findings);
    renderReport();
    setView("report");
  });

  document.getElementById("saveAssessmentBtn").addEventListener("click", function () {
    if (!state.report) return;

    const assessment = {
      id: createId("assessment"),
      createdAt: new Date().toISOString(),
      title: state.report.title,
      intake: state.intake,
      questions: state.questions,
      report: state.report
    };

    saveAssessment(assessment).then(function () {
      refreshSaved().then(function () {
        setView("saved");
      });
    });
  });

  document.getElementById("exportMarkdownBtn").addEventListener("click", function () {
    exportReportMarkdown();
  });

  document.getElementById("exportJsonBtn").addEventListener("click", function () {
    exportReportJson();
  });

  document.getElementById("clearFormBtn").addEventListener("click", function () {
    clearForm();
  });
}

function init() {
  bindNavigation();
  bindActions();
  populateSamples();
  renderQuestions();
  renderReport();
  refreshSaved();
  setView("intake");
}

document.addEventListener("DOMContentLoaded", init);