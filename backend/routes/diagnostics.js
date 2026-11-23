const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const { runDiagnostics } = require('../controllers/diagnosticsController');

router.post('/:systemId/run', auth, runDiagnostics);

module.exports = router;

