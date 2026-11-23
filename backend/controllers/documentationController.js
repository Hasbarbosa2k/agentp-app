const documentationService = require('../services/documentationService');
const System = require('../models/System');
const UiTestRun = require('../models/UiTestRun');
const DocumentReport = require('../models/DocumentReport');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

/**
 * Generates documentation report in PDF
 * POST /api/documentation/generate
 * Body: {
 *   systemId: string (optional),
 *   systemName: string (required if systemId not provided),
 *   testDescription: string (required - prompt describing tests),
 *   testRunId: string (optional - test run ID to include results),
 *   includeSystemInfo: boolean (optional - include system information),
 *   additionalContext: string (optional)
 * }
 */
async function generateDocumentation(req, res) {
  try {
    const { 
      systemId, 
      systemName: reqSystemName, 
      testDescription, 
      testRunId,
      includeSystemInfo = true,
      additionalContext 
    } = req.body;

    // Validação
    if (!testDescription || typeof testDescription !== 'string' || testDescription.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'testDescription is required and must be a description of the tests performed'
      });
    }

    let systemName = reqSystemName;
    let systemInfo = null;
    let testResults = null;

    // If systemId provided, fetch system information
    if (systemId) {
      try {
        const system = await System.findById(systemId);
        if (!system) {
          return res.status(404).json({
            success: false,
            message: 'System not found'
          });
        }
        systemName = system.name;
        
        if (includeSystemInfo) {
          systemInfo = {
            name: system.name,
            slug: system.slug,
            host: system.host,
            port: system.port,
            osType: system.osType,
            status: system.status,
            aiAnalyzedProfile: system.aiAnalyzedProfile,
            createdAt: system.createdAt,
            updatedAt: system.updatedAt
          };
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch system info:', err.message);
      }
    }

    // Validate system name
    if (!systemName || systemName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'systemName or systemId must be provided'
      });
    }

    // If testRunId provided, fetch test results
    if (testRunId) {
      try {
        const testRun = await UiTestRun.findById(testRunId).populate('testId');
        if (testRun) {
          testResults = {
            testName: testRun.testId?.name || 'N/A',
            testType: testRun.testId?.testType || 'N/A',
            status: testRun.status,
            startedAt: testRun.startedAt,
            completedAt: testRun.completedAt,
            steps: testRun.steps,
            summary: testRun.summary,
            error: testRun.error
          };
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch test run info:', err.message);
      }
    }

    // Fetch testRunIds if provided
    const { testRunIds = [] } = req.body;
    
    // If testRunIds provided, systemId is required
    if (testRunIds && testRunIds.length > 0 && !systemId) {
      return res.status(400).json({
        success: false,
        message: 'systemId is required when testRunIds are provided'
      });
    }

    // Validate that there is at least one test if systemId provided
    if (systemId && (!testRunIds || testRunIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one executed test must be selected to generate the report'
      });
    }

    let allTestResults = [];
    
    if (testRunIds && testRunIds.length > 0 && systemId) {
      try {
        // Fetch test runs - use only _id since systemSlug may vary
        const testRuns = await UiTestRun.find({ 
          _id: { $in: testRunIds }
        }).populate('relatedUiTestId', 'name testType description title objective');
        
        allTestResults = testRuns.map(testRun => ({
          testName: testRun.displayName || testRun.relatedUiTestId?.title || testRun.relatedUiTestId?.name || testRun.relatedUiTestId?.objective || 'N/A',
          testType: testRun.testType || testRun.relatedUiTestId?.testType || 'N/A',
          status: testRun.status,
          startedAt: testRun.startedAt,
          completedAt: testRun.completedAt,
          steps: testRun.steps,
          stepResults: testRun.stepResults,
          summary: testRun.description || testRun.relatedUiTestId?.description || '',
          error: testRun.error
        }));
      } catch (err) {
        console.warn('⚠️ Failed to fetch test runs:', err.message);
      }
    }

    // Generate PDF report
    console.log('📄 [DOC-CONTROLLER] Generating PDF report...', {
      systemName,
      systemId,
      testDescriptionLength: testDescription.length,
      testRunIdsCount: testRunIds.length,
      hasSystemInfo: !!systemInfo,
      hasTestResults: allTestResults.length > 0,
      userId: req.user?.id
    });

    // Create document in database (status: generating)
    // Note: If no systemId, we don't save (temporary report)
    let documentReport = null;
    if (systemId) {
      documentReport = new DocumentReport({
        title: `Report - ${systemName}`,
        systemId,
        systemName,
        testRunIds: testRunIds || [],
        testDescription,
        additionalContext: additionalContext || '',
        generatedBy: req.user.id,
        status: 'generating'
      });
      await documentReport.save();
    }

    try {
      const result = await documentationService.generatePdfReport({
        systemName,
        testDescription,
        testResults: allTestResults.length > 0 ? allTestResults : testResults,
        systemInfo,
        additionalContext
      });

      // Save PDF to file system (optional - can use cloud storage)
      const reportsDir = path.join(__dirname, '../storage/reports');
      try {
        await fs.mkdir(reportsDir, { recursive: true });
      } catch (err) {
        // Diretório já existe
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `${systemName}_report_${timestamp}.pdf`;
      
      // If documentReport exists, save PDF and update
      if (documentReport) {
        const pdfPath = path.join(reportsDir, `${documentReport._id}.pdf`);
        await fs.writeFile(pdfPath, result.pdfBuffer);

        // Update document with success
        documentReport.title = result.title || documentReport.title;
        documentReport.pdfPath = pdfPath;
        documentReport.pdfSize = result.pdfBuffer.length;
        documentReport.htmlContent = result.html || '';
        documentReport.metadata = result.metadata || documentReport.metadata;
        documentReport.status = 'completed';
        await documentReport.save();
      }

      // Send PDF as download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.pdfBuffer.length
      });

      res.send(result.pdfBuffer);

    } catch (error) {
      // Update document with error (if exists)
      if (documentReport) {
        documentReport.status = 'failed';
        documentReport.error = error.message;
        await documentReport.save();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error generating documentation:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating documentation report',
      error: error.message
    });
  }
}

/**
 * Preview HTML (without PDF conversion)
 * POST /api/documentation/preview
 */
async function previewDocumentation(req, res) {
  try {
    const { 
      systemId, 
      systemName: reqSystemName, 
      testDescription, 
      testRunId,
      includeSystemInfo = true,
      additionalContext 
    } = req.body;

    if (!testDescription) {
      return res.status(400).json({
        success: false,
        message: 'testDescription is required'
      });
    }

    let systemName = reqSystemName;
    let systemInfo = null;
    let testResults = null;

    // If systemId provided, fetch information
    if (systemId) {
      const system = await System.findById(systemId);
      if (system) {
        systemName = system.name;
        if (includeSystemInfo) {
          systemInfo = {
            name: system.name,
            slug: system.slug,
            host: system.host,
            osType: system.osType,
            status: system.status
          };
        }
      }
    }

    if (!systemName) {
      return res.status(400).json({
        success: false,
        message: 'systemName or systemId must be provided'
      });
    }

    // If testRunId provided, fetch results
    if (testRunId) {
      const testRun = await UiTestRun.findById(testRunId).populate('testId');
      if (testRun) {
        testResults = {
          testName: testRun.testId?.name || 'N/A',
          testType: testRun.testId?.testType || 'N/A',
          status: testRun.status,
          steps: testRun.steps
        };
      }
    }

    // Generate HTML only
    const report = await documentationService.generateDocumentationReport({
      systemName,
      testDescription,
      testResults,
      systemInfo,
      additionalContext
    });

    res.json({
      success: true,
      title: report.title,
      metadata: report.metadata,
      html: report.html
    });

  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error previewing documentation:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating documentation preview',
      error: error.message
    });
  }
}

/**
 * Lists all generated reports
 * GET /api/documentation/reports
 */
async function listReports(req, res) {
  try {
    const { systemId, limit = 50, skip = 0 } = req.query;
    
    const query = {};
    if (systemId) {
      query.systemId = systemId;
    }
    
    // Only reports from current user (or admin can see all)
    if (!req.user.isAdmin) {
      query.generatedBy = req.user.id;
    }

    const reports = await DocumentReport.find(query)
      .populate('systemId', 'name host')
      .populate('testRunIds', 'status startedAt completedAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await DocumentReport.countDocuments(query);

    res.json({
      success: true,
      data: reports.map(r => r.toSummary()),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error listing reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing reports',
      error: error.message
    });
  }
}

/**
 * Gets a specific report
 * GET /api/documentation/reports/:reportId
 */
async function getReport(req, res) {
  try {
    const { reportId } = req.params;
    
    const report = await DocumentReport.findById(reportId)
      .populate('systemId', 'name host slug')
      .populate('testRunIds')
      .populate('generatedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permission
    if (!req.user.isAdmin && report.generatedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No permission to access this report'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error getting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting report',
      error: error.message
    });
  }
}

/**
 * Download an existing report
 * GET /api/documentation/reports/:reportId/download
 */
async function downloadReport(req, res) {
  try {
    const { reportId } = req.params;
    
    const report = await DocumentReport.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permission
    if (!req.user.isAdmin && report.generatedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No permission to download this report'
      });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Report is not yet complete (status: ${report.status})`
      });
    }

    if (!report.pdfPath || !fsSync.existsSync(report.pdfPath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found'
      });
    }

    const pdfBuffer = await fs.readFile(report.pdfPath);
    const filename = `${report.systemName}_report_${report._id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error downloading report:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading report',
      error: error.message
    });
  }
}

/**
 * Fetches executed tests for a system
 * GET /api/documentation/systems/:systemId/test-runs
 */
async function getSystemTestRuns(req, res) {
  try {
    const { systemId } = req.params;
    
    // Verify system exists and get slug
    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'System not found'
      });
    }

    // Fetch completed test runs for system using systemSlug
    // Note: UiTestRun uses systemSlug, not systemId
    const testRuns = await UiTestRun.find({
      systemSlug: system.slug,
      status: { $in: ['completed', 'failed'] } // Apenas testes que foram executados
    })
      .populate('relatedUiTestId', 'name testType description title objective')
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: testRuns.map(tr => ({
        id: tr._id,
        testName: tr.displayName || tr.relatedUiTestId?.title || tr.relatedUiTestId?.name || tr.relatedUiTestId?.objective || 'N/A',
        testType: tr.testType || tr.relatedUiTestId?.testType || 'N/A',
        status: tr.status,
        startedAt: tr.startedAt,
        completedAt: tr.completedAt,
        summary: tr.description || tr.relatedUiTestId?.description || ''
      }))
    });
  } catch (error) {
    console.error('❌ [DOC-CONTROLLER] Error getting test runs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching executed tests',
      error: error.message
    });
  }
}

module.exports = {
  generateDocumentation,
  previewDocumentation,
  listReports,
  getReport,
  downloadReport,
  getSystemTestRuns
};
