// Attack Feasibility Calculator - ISO/SAE 21434 Compliant
class FeasibilityCalculator {
  constructor() {
    this.criteria = {
      elapsedTime: {
        name: 'Elapsed Time',
        description: 'Time required to identify and exploit the vulnerability',
        maxScore: 4,
        levels: [
          { value: 0, label: '≤ 1 day', description: 'Attack can be completed within one day' },
          { value: 1, label: '≤ 1 week', description: 'Attack requires up to one week' },
          { value: 2, label: '≤ 1 month', description: 'Attack requires up to one month' },
          { value: 3, label: '≤ 3 months', description: 'Attack requires up to three months' },
          { value: 4, label: '> 3 months', description: 'Attack requires more than three months' }
        ]
      },
      expertise: {
        name: 'Specialist Expertise',
        description: 'Required knowledge and skill level',
        maxScore: 8,
        levels: [
          { value: 0, label: 'Layman', description: 'No specialized knowledge required' },
          { value: 3, label: 'Proficient', description: 'Proficient in specific domain (e.g., automotive protocols)' },
          { value: 6, label: 'Expert', description: 'Expert in multiple domains' },
          { value: 8, label: 'Multiple Experts', description: 'Requires multiple experts from different domains' }
        ]
      },
      knowledge: {
        name: 'Knowledge of Item/Target',
        description: 'Required information about the target system',
        maxScore: 11,
        levels: [
          { value: 0, label: 'Public', description: 'Publicly available information' },
          { value: 3, label: 'Restricted', description: 'Restricted information (e.g., workshop manuals)' },
          { value: 7, label: 'Confidential', description: 'Confidential information (e.g., detailed designs)' },
          { value: 11, label: 'Strictly Confidential', description: 'Strictly confidential (e.g., proprietary algorithms)' }
        ]
      },
      window: {
        name: 'Window of Opportunity',
        description: 'Access time and conditions required',
        maxScore: 6,
        levels: [
          { value: 0, label: 'Unlimited Access', description: 'Easy unlimited access (e.g., remote attack)' },
          { value: 1, label: 'Easy', description: 'Easy or moderate access (e.g., parked vehicle)' },
          { value: 3, label: 'Moderate', description: 'Moderate access with some constraints' },
          { value: 4, label: 'Difficult', description: 'Difficult access (e.g., secured facility)' },
          { value: 6, label: 'None', description: 'No opportunity or impractical' }
        ]
      },
      equipment: {
        name: 'Equipment Required',
        description: 'Tools and hardware needed for attack',
        maxScore: 7,
        levels: [
          { value: 0, label: 'Standard', description: 'Standard equipment (e.g., laptop, software)' },
          { value: 2, label: 'Specialized', description: 'Specialized equipment (e.g., CAN analyzers)' },
          { value: 5, label: 'Bespoke', description: 'Bespoke equipment (e.g., custom hardware)' },
          { value: 7, label: 'Multiple Bespoke', description: 'Multiple bespoke items' }
        ]
      }
    };

    this.feasibilityRatings = [
      { min: 0, max: 3, level: 'Very High', color: '#dc3545', description: 'Attack is trivial to execute' },
      { min: 4, max: 6, level: 'High', color: '#fd7e14', description: 'Attack is relatively easy to execute' },
      { min: 7, max: 13, level: 'Medium', color: '#ffc107', description: 'Attack requires moderate effort' },
      { min: 14, max: 19, level: 'Low', color: '#20c997', description: 'Attack is difficult to execute' },
      { min: 20, max: 24, level: 'Very Low', color: '#28a745', description: 'Attack is extremely difficult' }
    ];
  }

  // Calculate total feasibility score
  calculateFeasibility(scores) {
    const total = Object.values(scores).reduce((sum, val) => sum + parseInt(val), 0);
    const rating = this.getFeasibilityRating(total);
    
    return {
      totalScore: total,
      maxScore: 24,
      rating: rating.level,
      color: rating.color,
      description: rating.description,
      breakdown: this.getScoreBreakdown(scores),
      rationale: this.generateRationale(scores, total, rating)
    };
  }

  // Get feasibility rating from total score
  getFeasibilityRating(score) {
    return this.feasibilityRatings.find(r => score >= r.min && score <= r.max) || 
           this.feasibilityRatings[2]; // Default to Medium
  }

  // Get detailed score breakdown
  getScoreBreakdown(scores) {
    return Object.entries(scores).map(([key, value]) => {
      const criterion = this.criteria[key];
      const level = criterion.levels.find(l => l.value === parseInt(value));
      return {
        criterion: criterion.name,
        score: parseInt(value),
        maxScore: criterion.maxScore,
        percentage: Math.round((parseInt(value) / criterion.maxScore) * 100),
        level: level?.label || 'Unknown',
        description: level?.description || ''
      };
    });
  }

  // Generate detailed rationale
  generateRationale(scores, total, rating) {
    let rationale = `Attack Feasibility: ${rating.level} (Score: ${total}/24)\n\
`;
    rationale += `${rating.description}\
\n`;
    rationale += 'Detailed Analysis:\
';

    Object.entries(scores).forEach(([key, value]) => {
      const criterion = this.criteria[key];
      const level = criterion.levels.find(l => l.value === parseInt(value));
      const percentage = Math.round((parseInt(value) / criterion.maxScore) * 100);
      
      rationale += `\n• ${criterion.name}: ${value}/${criterion.maxScore} points (${percentage}% difficulty)\
`;
      rationale += `  ${level?.description || 'Not specified'}\
`;
    });

    rationale += '\
' + this.getInterpretation(rating.level);
    
    return rationale;
  }

  // Get interpretation based on rating
  getInterpretation(ratingLevel) {
    const interpretations = {
      'Very High': 'CRITICAL: This attack is extremely feasible and could be executed by attackers with minimal resources. Immediate implementation of security controls is required. Consider this a highest priority risk.',
      'High': 'HIGH PRIORITY: This attack is feasible with readily available resources. Strongly recommend implementing multiple layers of security controls. Prioritize in current development cycle.',
      'Medium': 'MODERATE: This attack requires moderate effort and resources. Implement appropriate controls based on asset criticality and organizational risk appetite. Plan for next release cycle.',
      'Low': 'LOW PRIORITY: This attack is difficult to execute and requires significant resources. Monitor for changes in threat landscape. Consider controls based on regulatory requirements and asset value.',
      'Very Low': 'MINIMAL: This attack is extremely difficult to execute and requires extensive specialized resources. Risk may be acceptable depending on asset criticality. Periodic review recommended.'
    };
    
    return 'Interpretation: ' + (interpretations[ratingLevel] || 'Unknown rating level');
  }

  // Validate scores
  validateScores(scores) {
    const errors = [];
    
    Object.entries(scores).forEach(([key, value]) => {
      const criterion = this.criteria[key];
      if (!criterion) {
        errors.push(`Unknown criterion: ${key}`);
        return;
      }
      
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        errors.push(`${criterion.name}: Invalid value (must be a number)`);
      } else if (numValue < 0 || numValue > criterion.maxScore) {
        errors.push(`${criterion.name}: Value out of range (0-${criterion.maxScore})`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Get criterion information
  getCriterionInfo(criterionKey) {
    return this.criteria[criterionKey] || null;
  }

  // Get all criteria
  getAllCriteria() {
    return this.criteria;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeasibilityCalculator;
}