const axios = require('axios');
const htmlPdf = require('html-pdf-node');

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';

/**
 * Generates documentation report using AI
 * @param {Object} params - Report generation parameters
 * @param {string} params.systemName - System name
 * @param {string} params.testDescription - Description of tests performed
 * @param {Object} [params.testResults] - Test results (optional)
 * @param {Object} [params.systemInfo] - System information (optional)
 * @param {string} [params.additionalContext] - Additional context (optional)
 * @returns {Promise<Object>} Generated report (HTML and metadata)
 */
async function generateDocumentationReport(params) {
  const { systemName, testDescription, testResults, systemInfo, additionalContext } = params;
  
  console.log('📄 [DOC-SERVICE] Generating documentation report...', {
    systemName,
    testDescriptionLength: testDescription?.length || 0,
    hasTestResults: !!testResults,
    hasSystemInfo: !!systemInfo,
    hasAdditionalContext: !!additionalContext
  });

  try {
    const url = `${AI_SERVER_URL}/api/documentation/generate-report`;
    const response = await axios.post(url, {
      systemName,
      testDescription,
      testResults,
      systemInfo,
      additionalContext,
      options: {
        temperature: 0.7,
        max_tokens: 4000
      }
    }, {
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.html) {
      throw new Error('AI service did not return valid HTML');
    }

    console.log('✅ [DOC-SERVICE] Report generated successfully', {
      title: response.data.title,
      htmlLength: response.data.html.length
    });

    return response.data;
  } catch (error) {
    console.error('❌ [DOC-SERVICE] Failed to generate report:', error.message);
    if (error.response) {
      console.error('AI Server Response:', error.response.data);
    }
    throw new Error(`Failed to generate documentation report: ${error.message}`);
  }
}

/**
 * Converts HTML to PDF
 * @param {string} html - HTML content
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} Generated PDF buffer
 */
async function convertHtmlToPdf(html, options = {}) {
  console.log('📄 [DOC-SERVICE] Converting HTML to PDF...');
  
  const defaultOptions = {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground: true,
    preferCSSPageSize: false,
    ...options
  };

  try {
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, defaultOptions);
    
    console.log('✅ [DOC-SERVICE] PDF generated successfully', {
      sizeKB: Math.round(pdfBuffer.length / 1024)
    });
    
    return pdfBuffer;
  } catch (error) {
    console.error('❌ [DOC-SERVICE] Failed to convert HTML to PDF:', error.message);
    throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
  }
}

/**
 * Generates complete PDF report
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} { pdfBuffer, title, metadata, html }
 */
async function generatePdfReport(params) {
  console.log('📄 [DOC-SERVICE] Starting full PDF report generation...');
  
  try {
    // Generate HTML content via AI
    const report = await generateDocumentationReport(params);
    
    // Convert HTML to PDF
    const pdfBuffer = await convertHtmlToPdf(report.html);
    
    return {
      pdfBuffer,
      title: report.title,
      metadata: report.metadata,
      html: report.html
    };
  } catch (error) {
    console.error('❌ [DOC-SERVICE] Failed to generate PDF report:', error.message);
    throw error;
  }
}

module.exports = {
  generateDocumentationReport,
  convertHtmlToPdf,
  generatePdfReport
};
