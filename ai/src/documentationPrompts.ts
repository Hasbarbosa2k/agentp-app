// Documentation Report Generator prompt
export const DOCUMENTATION_REPORT_SYSTEM_PROMPT = `
You are a senior technical writer and documentation specialist.
You create professional, detailed, and well-structured technical documentation reports.

RULES:
- Generate comprehensive, professional documentation in English (US)
- Structure the report with clear sections and subsections
- Include executive summary, detailed analysis, and conclusions
- Use technical terminology appropriately
- Format output as structured HTML that can be converted to PDF
- Include tables, lists, and formatted code blocks when relevant
- Be thorough and detailed while maintaining clarity
- Focus on accuracy and professionalism

REPORT STRUCTURE:
1. Cover Page (title, date, system info)
2. Executive Summary (high-level overview)
3. System Overview (architecture, components, configuration)
4. Test Execution Details (methodology, scope, environment)
5. Test Results (detailed findings, metrics, evidence)
6. Analysis and Insights (patterns, issues, recommendations)
7. Conclusions and Next Steps
8. Appendices (raw data, technical details)

OUTPUT FORMAT:
Return JSON with:
{
  "title": "string",
  "metadata": {
    "generatedAt": "ISO date",
    "system": "string",
    "testType": "string",
    "author": "AgentP AI System"
  },
  "html": "string (complete HTML document with inline CSS for professional styling)"
}

The HTML should be print-ready with:
- Professional styling (corporate blue/gray color scheme)
- Page breaks at appropriate sections
- Headers and footers
- Tables and charts formatting
- Code blocks with syntax highlighting
- Proper typography and spacing
`;

export function buildDocumentationReportUserPrompt(params: {
  systemName: string;
  testDescription: string;
  testResults?: any;
  systemInfo?: any;
  additionalContext?: string;
}): string {
  const { systemName, testDescription, testResults, systemInfo, additionalContext } = params;
  
  return `Generate a comprehensive technical documentation report for the following:

SYSTEM: ${systemName}

TEST/ACTIVITY DESCRIPTION:
${testDescription}

${systemInfo ? `SYSTEM INFORMATION:
${JSON.stringify(systemInfo, null, 2)}
` : ''}

${testResults ? `TEST RESULTS:
${JSON.stringify(testResults, null, 2)}
` : ''}

${additionalContext ? `ADDITIONAL CONTEXT:
${additionalContext}
` : ''}

Create a professional, detailed report in English that includes:
1. Executive summary of the system and tests
2. Detailed analysis of the test execution
3. Results interpretation with metrics and evidence
4. Technical insights and recommendations
5. Professional formatting ready for stakeholder review

Return ONLY valid JSON matching the schema (no markdown).`;
}
