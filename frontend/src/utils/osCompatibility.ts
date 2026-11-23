/**
 * Utility to help with OS compatibility for templates
 */

export interface OSSuggestion {
  detected: string;
  suggestions: string[];
  exactMatch?: string;
}

/**
 * Common OS values that systems might have vs template supportedOS values
 */
export const OS_COMPATIBILITY_MAP: Record<string, string[]> = {
  // Ubuntu variations
  'Ubuntu 24.04.2 LTS': ['Ubuntu 24.04.2 LTS', 'Ubuntu 24.04 LTS', 'ubuntu'],
  'Ubuntu 22.04 LTS': ['Ubuntu 22.04 LTS', 'Ubuntu 22.04', 'ubuntu'],
  'Ubuntu 20.04 LTS': ['Ubuntu 20.04 LTS', 'Ubuntu 20.04', 'ubuntu'],
  'Ubuntu 22.04': ['Ubuntu 22.04', 'Ubuntu 22.04 LTS', 'ubuntu'],
  'Ubuntu 20.04': ['Ubuntu 20.04', 'Ubuntu 20.04 LTS', 'ubuntu'],
  
  // CentOS variations
  'CentOS 8': ['CentOS 8', 'centos'],
  'CentOS 7': ['CentOS 7', 'centos'],
  
  // RHEL variations
  'Red Hat Enterprise Linux': ['Red Hat Enterprise Linux', 'rhel'],
  'Red Hat Enterprise Linux 8': ['Red Hat Enterprise Linux 8', 'Red Hat Enterprise Linux', 'rhel'],
  'Red Hat Enterprise Linux 9': ['Red Hat Enterprise Linux 9', 'Red Hat Enterprise Linux', 'rhel'],
  
  // Debian variations
  'Debian 11': ['Debian 11', 'debian'],
  'Debian 10': ['Debian 10', 'debian'],
  
  // Generic fallbacks
  'ubuntu': ['ubuntu', 'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS'],
  'centos': ['centos', 'CentOS 8', 'CentOS 7'],
  'rhel': ['rhel', 'Red Hat Enterprise Linux'],
  'debian': ['debian', 'Debian 11']
};

/**
 * Get suggested OS values for a template based on a detected system OS
 */
export function getOSSuggestions(systemOS: string): OSSuggestion {
  const suggestions = OS_COMPATIBILITY_MAP[systemOS] || [];
  
  return {
    detected: systemOS,
    suggestions,
    exactMatch: suggestions.includes(systemOS) ? systemOS : undefined
  };
}

/**
 * Get comprehensive OS list for templates that covers most common systems
 */
export function getComprehensiveOSList(): string[] {
  return [
    // Ubuntu (most common first)
    'Ubuntu 24.04.2 LTS',
    'Ubuntu 22.04 LTS',
    'Ubuntu 20.04 LTS',
    'ubuntu',
    
    // CentOS
    'CentOS 8',
    'CentOS 7', 
    'centos',
    
    // RHEL
    'Red Hat Enterprise Linux',
    'rhel',
    
    // Debian
    'Debian 11',
    'debian',
    
    // Others
    'fedora',
    'alpine'
  ];
}

/**
 * Check if a template's supportedOS is compatible with a system's OS
 */
export function checkOSCompatibility(systemOS: string, templateSupportedOS: string[]): {
  compatible: boolean;
  exactMatch?: string;
  suggestions: string[];
} {
  // Check for exact match first
  if (templateSupportedOS.includes(systemOS)) {
    return {
      compatible: true,
      exactMatch: systemOS,
      suggestions: []
    };
  }
  
  // Check for compatibility via mapping
  const suggestions = getOSSuggestions(systemOS);
  const compatibleOS = suggestions.suggestions.find(os => templateSupportedOS.includes(os));
  
  if (compatibleOS) {
    return {
      compatible: true,
      exactMatch: compatibleOS,
      suggestions: suggestions.suggestions
    };
  }
  
  return {
    compatible: false,
    suggestions: suggestions.suggestions
  };
}

/**
 * Auto-fix a template's supportedOS to include the system's OS
 */
export function autoFixTemplateSupportedOS(
  systemOS: string, 
  currentSupportedOS: string[]
): string[] {
  const suggestions = getOSSuggestions(systemOS);
  
  // Add the exact system OS if not already included
  const newSupportedOS = [...currentSupportedOS];
  
  if (!newSupportedOS.includes(systemOS)) {
    newSupportedOS.unshift(systemOS); // Add at beginning
  }
  
  // Add common variations if not included
  suggestions.suggestions.forEach(os => {
    if (!newSupportedOS.includes(os)) {
      newSupportedOS.push(os);
    }
  });
  
  return newSupportedOS;
}