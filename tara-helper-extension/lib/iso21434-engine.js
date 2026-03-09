// ISO/SAE 21434 Engine - Core compliance logic
class ISO21434Engine {
  constructor() {
    this.impactScale = {
      severe: 4,
      major: 3,
      moderate: 2,
      minor: 1,
      negligible: 0
    };

    this.impactCategories = ['safety', 'financial', 'operational', 'privacy'];
  }

  // Calculate risk level based on impact and feasibility
  calculateRiskLevel(impactRating, feasibilityScore) {
    // ISO 21434 Risk Determination Matrix
    // Feasibility: Very High (0-3), High (4-6), Medium (7-13), Low (14-19), Very Low (20-24)
    // Impact: Severe(4), Major(3), Moderate(2), Minor(1)
    
    const feasibilityLevel = this.getFeasibilityLevel(feasibilityScore);
    
    const riskMatrix = {
      'Very High': { 4: 5, 3: 5, 2: 4, 1: 3 },
      'High': { 4: 5, 3: 4, 2: 3, 1: 2 },
      'Medium': { 4: 4, 3: 3, 2: 2, 1: 1 },
      'Low': { 4: 3, 3: 2, 2: 1, 1: 1 },
      'Very Low': { 4: 2, 3: 1, 2: 1, 1: 1 }
    };

    const riskValue = riskMatrix[feasibilityLevel][impactRating] || 1;
    return this.getRiskLevelName(riskValue);
  }

  // Get feasibility level from score
  getFeasibilityLevel(score) {
    if (score <= 3) return 'Very High';
    if (score <= 6) return 'High';
    if (score <= 13) return 'Medium';
    if (score <= 19) return 'Low';
    return 'Very Low';
  }

  // Get risk level name
  getRiskLevelName(value) {
    const levels = {
      5: 'Very High Risk',
      4: 'High Risk',
      3: 'Medium Risk',
      2: 'Low Risk',
      1: 'Very Low Risk'
    };
    return levels[value] || 'Unknown';
  }

  // Determine impact rating (max of all categories)
  determineImpactRating(impacts) {
    return Math.max(...Object.values(impacts));
  }

  // Generate threat scenario template
  generateThreatScenario(threat, assets) {
    return {
      id: `TS-${Date.now()}`,
      name: threat.name,
      description: threat.description,
      strideCategory: threat.strideCategory,
      affectedAssets: assets,
      impactAnalysis: {
        safety: threat.impactRatings?.safety || 0,
        financial: threat.impactRatings?.financial || 0,
        operational: threat.impactRatings?.operational || 0,
        privacy: threat.impactRatings?.privacy || 0
      },
      attackPath: [],
      prerequisites: [],
      threatActors: this.identifyThreatActors(threat),
      iso21434Compliance: {
        threatType: this.mapToISO21434ThreatType(threat.strideCategory),
        relevantClauses: this.getRelevantClauses(threat)
      },
      timestamp: new Date().toISOString()
    };
  }

  // Map STRIDE to ISO 21434 threat types
  mapToISO21434ThreatType(strideCategory) {
    const mapping = {
      'Spoofing': 'Identity Spoofing',
      'Tampering': 'Data/System Tampering',
      'Repudiation': 'Repudiation of Actions',
      'Information Disclosure': 'Information Disclosure/Data Breach',
      'Denial of Service': 'Denial of Service',
      'Elevation of Privilege': 'Unauthorized Access/Privilege Escalation'
    };
    return mapping[strideCategory] || 'Unknown';
  }

  // Identify potential threat actors
  identifyThreatActors(threat) {
    const actors = [];
    
    if (threat.attackVectors?.includes('Network')) {
      actors.push('Remote Attacker');
    }
    if (threat.attackVectors?.includes('Physical')) {
      actors.push('Physical Attacker with Vehicle Access');
    }
    if (threat.attackVectors?.includes('Wireless')) {
      actors.push('Nearby Attacker with RF Equipment');
    }
    if (threat.description.toLowerCase().includes('insider')) {
      actors.push('Malicious Insider');
    }
    
    return actors.length > 0 ? actors : ['Unspecified'];
  }

  // Get relevant ISO 21434 clauses
  getRelevantClauses(threat) {
    const clauses = new Set(['Clause 15 - Threat analysis and risk assessment']);
    
    if (threat.strideCategory === 'Tampering') {
      clauses.add('Clause 8.5 - Software and data integrity');
    }
    if (threat.strideCategory === 'Information Disclosure') {
      clauses.add('Clause 8.4 - Cryptography');
    }
    if (threat.strideCategory === 'Elevation of Privilege') {
      clauses.add('Clause 8.3 - Identity and access management');
    }
    if (threat.attackVectors?.includes('Network')) {
      clauses.add('Clause 8.2 - Network architecture and communication');
    }
    
    return Array.from(clauses);
  }

  // Validate threat scenario completeness
  validateScenario(scenario) {
    const required = ['name', 'description', 'affectedAssets', 'impactAnalysis'];
    const missing = required.filter(field => !scenario[field] || 
      (Array.isArray(scenario[field]) && scenario[field].length === 0));
    
    return {
      isValid: missing.length === 0,
      missingFields: missing,
      completeness: ((required.length - missing.length) / required.length * 100).toFixed(0)
    };
  }

  // Generate risk treatment recommendation
  recommendTreatment(riskLevel, feasibility, impact) {
    if (riskLevel.includes('Very High') || riskLevel.includes('High')) {
      return {
        treatment: 'Reduce',
        priority: 'Critical',
        recommendation: 'Implement security controls immediately to reduce risk to acceptable level. Consider multiple layers of defense.',
        timeframe: 'Immediate (< 30 days)'
      };
    } else if (riskLevel.includes('Medium')) {
      return {
        treatment: 'Reduce',
        priority: 'High',
        recommendation: 'Implement appropriate security controls based on cost-benefit analysis. Plan for implementation in next development cycle.',
        timeframe: 'Short-term (< 90 days)'
      };
    } else {
      return {
        treatment: 'Accept/Monitor',
        priority: 'Low',
        recommendation: 'Risk may be acceptable. Monitor for changes and implement controls if risk increases.',
        timeframe: 'Long-term (next release cycle)'
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ISO21434Engine;
}