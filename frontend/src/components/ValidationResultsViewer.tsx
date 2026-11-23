import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { StepValidationResult, TemplateValidationResult } from '../types/template.types';

interface ValidationResultsViewerProps {
  stepValidation: StepValidationResult;
  className?: string;
}

export default function ValidationResultsViewer({ 
  stepValidation, 
  className = '' 
}: ValidationResultsViewerProps) {
  const { stepName, overallSuccess, passedValidations, totalValidations, validationResults } = stepValidation;

  const getValidationIcon = (result: TemplateValidationResult) => {
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (result.required) {
      return <XCircle className="w-5 h-5 text-red-400" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getValidationColor = (result: TemplateValidationResult) => {
    if (result.success) {
      return 'border-green-500 bg-green-500/10';
    } else if (result.required) {
      return 'border-red-500 bg-red-500/10';
    } else {
      return 'border-yellow-500 bg-yellow-500/10';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      string_contains: 'Contains String',
      string_not_contains: 'Does Not Contain String',
      regex_match: 'Regex Match',
      numeric_range: 'Numeric Range',
      exists: 'Exists',
      not_exists: 'Does Not Exist',
      output_contains: 'Output Contains'
    };
    return labels[type] || type;
  };

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">
              Validations: {stepName}
            </h3>
            {overallSuccess ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
          </div>
          
          <div className="text-sm text-gray-400">
            {passedValidations}/{totalValidations} passed
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3">
          <div className="flex items-center gap-4 text-sm">
            <span className={`font-medium ${overallSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {overallSuccess ? 'All required validations passed' : 'Some validations failed'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                overallSuccess ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${(passedValidations / totalValidations) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation Results */}
      <div className="p-4 space-y-3">
        {validationResults.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getValidationColor(result)}`}
          >
            <div className="flex items-start gap-3">
              {getValidationIcon(result)}
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {getTypeLabel(result.type)}
                    </span>
                    {result.required && (
                      <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                        Required
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-sm font-medium ${
                    result.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.success ? 'Passed' : 'Failed'}
                  </span>
                </div>

                {/* Validation Value */}
                {result.value && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Expected value: </span>
                    <code className="text-sm bg-gray-900 px-2 py-1 rounded text-blue-300">
                      {result.value}
                    </code>
                  </div>
                )}

                {/* Details */}
                <div className="text-sm text-gray-300">
                  {result.details}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-700 bg-gray-750 rounded-b-lg">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>
            Required validations must pass for the step to be considered successful.
            Optional validations are for informational purposes only.
          </span>
        </div>
      </div>
    </div>
  );
}