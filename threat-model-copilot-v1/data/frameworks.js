window.Frameworks = {
  stride: {
    spoofing: { framework: "STRIDE", id: "S", title: "Spoofing identity" },
    tampering: { framework: "STRIDE", id: "T", title: "Tampering with data or systems" },
    repudiation: { framework: "STRIDE", id: "R", title: "Repudiation" },
    informationDisclosure: { framework: "STRIDE", id: "I", title: "Information disclosure" },
    denialOfService: { framework: "STRIDE", id: "D", title: "Denial of service" },
    elevationOfPrivilege: { framework: "STRIDE", id: "E", title: "Elevation of privilege" }
  },

  owaspTop10: {
    brokenAccess: { framework: "OWASP Top 10", id: "A01:2021", title: "Broken Access Control" },
    cryptoFailures: { framework: "OWASP Top 10", id: "A02:2021", title: "Cryptographic Failures" },
    injection: { framework: "OWASP Top 10", id: "A03:2021", title: "Injection" },
    insecureDesign: { framework: "OWASP Top 10", id: "A04:2021", title: "Insecure Design" },
    securityMisconfig: { framework: "OWASP Top 10", id: "A05:2021", title: "Security Misconfiguration" },
    vulnComponents: { framework: "OWASP Top 10", id: "A06:2021", title: "Vulnerable and Outdated Components" },
    idAuthFailures: { framework: "OWASP Top 10", id: "A07:2021", title: "Identification and Authentication Failures" },
    softwareIntegrity: { framework: "OWASP Top 10", id: "A08:2021", title: "Software and Data Integrity Failures" },
    loggingFailures: { framework: "OWASP Top 10", id: "A09:2021", title: "Security Logging and Monitoring Failures" },
    ssrf: { framework: "OWASP Top 10", id: "A10:2021", title: "Server-Side Request Forgery" }
  },

  owaspApi: {
    api1: { framework: "OWASP API Security Top 10", id: "API1:2023", title: "Broken Object Level Authorization" },
    api2: { framework: "OWASP API Security Top 10", id: "API2:2023", title: "Broken Authentication" },
    api3: { framework: "OWASP API Security Top 10", id: "API3:2023", title: "Broken Object Property Level Authorization" },
    api4: { framework: "OWASP API Security Top 10", id: "API4:2023", title: "Unrestricted Resource Consumption" },
    api5: { framework: "OWASP API Security Top 10", id: "API5:2023", title: "Broken Function Level Authorization" },
    api6: { framework: "OWASP API Security Top 10", id: "API6:2023", title: "Unrestricted Access to Sensitive Business Flows" },
    api7: { framework: "OWASP API Security Top 10", id: "API7:2023", title: "Server Side Request Forgery" },
    api8: { framework: "OWASP API Security Top 10", id: "API8:2023", title: "Security Misconfiguration" },
    api9: { framework: "OWASP API Security Top 10", id: "API9:2023", title: "Improper Inventory Management" },
    api10: { framework: "OWASP API Security Top 10", id: "API10:2023", title: "Unsafe Consumption of APIs" }
  },

  owaspLlm: {
    llm01: { framework: "OWASP LLM Top 10", id: "LLM01", title: "Prompt Injection" },
    llm02: { framework: "OWASP LLM Top 10", id: "LLM02", title: "Insecure Output Handling" },
    llm04: { framework: "OWASP LLM Top 10", id: "LLM04", title: "Data and Model Poisoning" },
    llm06: { framework: "OWASP LLM Top 10", id: "LLM06", title: "Sensitive Information Disclosure" },
    llm07: { framework: "OWASP LLM Top 10", id: "LLM07", title: "Insecure Plugin Design" },
    llm08: { framework: "OWASP LLM Top 10", id: "LLM08", title: "Excessive Agency" }
  },

  mitreAttack: {
    validAccounts: { framework: "MITRE ATT&CK", id: "T1078", title: "Valid Accounts" },
    exploitPublicApp: { framework: "MITRE ATT&CK", id: "T1190", title: "Exploit Public-Facing Application" },
    bruteForce: { framework: "MITRE ATT&CK", id: "T1110", title: "Brute Force" },
    exfiltration: { framework: "MITRE ATT&CK", id: "TA0010", title: "Exfiltration" },
    endpointDos: { framework: "MITRE ATT&CK", id: "T1499", title: "Endpoint Denial of Service" }
  },

  mitreAtlas: {
    promptInjection: { framework: "MITRE ATLAS", id: "AML.T0051", title: "Prompt Injection" },
    dataPoisoning: { framework: "MITRE ATLAS", id: "AML.T0018", title: "Data Poisoning" },
    modelExfil: { framework: "MITRE ATLAS", id: "AML.T0016", title: "Model Extraction" },
    evasion: { framework: "MITRE ATLAS", id: "AML.T0040", title: "Evasion" },
    abuseApi: { framework: "MITRE ATLAS", id: "AML.T0029", title: "ML Model Inference API Abuse" }
  },

  nistAiRmf: {
    govern: { framework: "NIST AI RMF", id: "GOVERN", title: "Govern" },
    map: { framework: "NIST AI RMF", id: "MAP", title: "Map" },
    measure: { framework: "NIST AI RMF", id: "MEASURE", title: "Measure" },
    manage: { framework: "NIST AI RMF", id: "MANAGE", title: "Manage" }
  },

  nistCsf: {
    govern: { framework: "NIST CSF 2.0", id: "GV", title: "Govern" },
    identify: { framework: "NIST CSF 2.0", id: "ID", title: "Identify" },
    protect: { framework: "NIST CSF 2.0", id: "PR", title: "Protect" },
    detect: { framework: "NIST CSF 2.0", id: "DE", title: "Detect" },
    respond: { framework: "NIST CSF 2.0", id: "RS", title: "Respond" },
    recover: { framework: "NIST CSF 2.0", id: "RC", title: "Recover" }
  },

  unr155: {
    externalInterfaces: {
      framework: "UN R155 Annex 5",
      id: "5.1",
      title: "Threats from external connectivity and interfaces"
    },
    backendThreats: {
      framework: "UN R155 Annex 5",
      id: "5.2",
      title: "Threats to back-end servers or supporting infrastructure"
    },
    updateManipulation: {
      framework: "UN R155 Annex 5",
      id: "5.3",
      title: "Threats involving software or firmware update manipulation"
    },
    unauthorizedAccess: {
      framework: "UN R155 Annex 5",
      id: "5.4",
      title: "Unauthorized access to vehicle systems or data"
    },
    dataDisclosure: {
      framework: "UN R155 Annex 5",
      id: "5.5",
      title: "Data disclosure or privacy compromise"
    },
    sensorSignalManipulation: {
      framework: "UN R155 Annex 5",
      id: "5.6",
      title: "Manipulation of sensors, signals, or communication channels"
    },
    availability: {
      framework: "UN R155 Annex 5",
      id: "5.7",
      title: "Availability disruption of vehicle functions or services"
    }
  }
};