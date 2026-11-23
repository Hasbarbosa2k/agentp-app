import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { templatesService, type Template, type TemplateCategory, type ValidationType, type UpdateTemplateRequest } from '../services';
import { useToast } from '../contexts/ToastContext';
import { validateTemplateData } from '../utils/templateValidator';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  onTemplateUpdated?: (templateId: string) => void;
}

interface TemplateStepForm {
  name: string;
  description: string;
  command: string;
  timeout: number;
  retryable: boolean;
  required: boolean;
  category: string;
  validations: TemplateValidationForm[];
}

interface TemplateValidationForm {
  type: ValidationType;
  value: string;
  description: string;
  required: boolean;
}

const categoryLabels: Record<TemplateCategory, string> = {
  system_discovery: 'System Discovery',
  security_audit: 'Security Audit',
  network_check: 'Network Check',
  custom: 'Custom'
};

const validationTypeLabels: Record<ValidationType, string> = {
  string_contains: 'Contains String',
  string_not_contains: 'Does Not Contain String',
  regex_match: 'Regex Match',
  numeric_range: 'Numeric Range',
  exists: 'Exists',
  not_exists: 'Does Not Exist',
  output_contains: 'Output Contains'
};

export default function EditTemplateModal({ 
  isOpen, 
  onClose, 
  template,
  onTemplateUpdated
}: EditTemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('system_discovery');
  const [templateVersion, setTemplateVersion] = useState('');
  const [steps, setSteps] = useState<TemplateStepForm[]>([]);

  // Load template data when modal opens
  useEffect(() => {
    if (template && isOpen) {
      setTemplateName(template.name);
      setTemplateDescription(template.description);
      setTemplateCategory(template.category as TemplateCategory);
      setTemplateVersion(template.version);
      
      // Convert template steps to form format
      const formSteps = template.steps.map(step => {
        console.log('🔍 [EDIT-TEMPLATE] Loading step validations:', step.validations);
        return {
          name: step.name,
          description: step.description || '',
          command: step.command,
          timeout: step.timeout || 10000,
          retryable: step.retryable || false,
          required: step.required !== false,
          category: step.category || 'system',
          validations: step.validations?.map(v => {
            console.log('🔍 [EDIT-TEMPLATE] Original validation description:', v.description);
            return {
              type: v.type,
              value: v.value,
              description: v.description || '', // Preserve exact original description
              required: v.required || false
            };
          }) || []
        };
      });
      
      setSteps(formSteps);
    }
  }, [template, isOpen]);

  const addStep = () => {
    setSteps([...steps, {
      name: '',
      description: '',
      command: '',
      timeout: 10000,
      retryable: true,
      required: true,
      category: 'system',
      validations: []
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof TemplateStepForm, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setSteps(updatedSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    setSteps(updatedSteps);
  };

  const addValidation = (stepIndex: number) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].validations.push({
      type: 'string_contains',
      value: '',
      description: '',
      required: false
    });
    setSteps(updatedSteps);
  };

  const removeValidation = (stepIndex: number, validationIndex: number) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].validations = updatedSteps[stepIndex].validations.filter((_, i) => i !== validationIndex);
    setSteps(updatedSteps);
  };

  const updateValidation = (stepIndex: number, validationIndex: number, field: keyof TemplateValidationForm, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].validations[validationIndex] = {
      ...updatedSteps[stepIndex].validations[validationIndex],
      [field]: value
    };
    setSteps(updatedSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template || !templateName || !templateDescription || steps.length === 0) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);

    try {
      // Prepare update data
      const updateData: UpdateTemplateRequest = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        category: templateCategory,
        version: templateVersion.trim(),
        steps: steps.map((step, index) => ({
          name: step.name.trim(),
          description: step.description?.trim() || '',
          command: step.command.trim(),
          validations: step.validations
            ?.filter(v => v.value && v.value.trim())
            ?.map(v => ({
              type: v.type,
              value: v.value.trim(),
              description: v.description?.trim() || '',
              required: v.required || false
            })) || [],
          timeout: step.timeout || 10000,
          retryable: step.retryable || false,
          required: step.required !== false,
          category: step.category || 'system',
          order: index + 1
        }))
      };

      console.log('📋 [EDIT-TEMPLATE] Updating template:', template._id);
      console.log('📋 [EDIT-TEMPLATE] Update data:', JSON.stringify(updateData, null, 2));
      
      const updatedTemplate = await templatesService.updateTemplate(template._id, updateData);
      
      console.log('✅ [EDIT-TEMPLATE] Template updated:', updatedTemplate);
      
      showToast(`Template "${updatedTemplate.name}" updated successfully!`, 'success');
      
      if (onTemplateUpdated) {
        onTemplateUpdated(updatedTemplate._id);
      }
      
      onClose();

    } catch (error: any) {
      console.error('❌ [EDIT-TEMPLATE] Error updating template:', error);
      console.error('❌ [EDIT-TEMPLATE] Error details:', error.response?.data);
      
      let errorMessage = 'Unknown error';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('❌ [EDIT-TEMPLATE] Full error response:', errorData);
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.details) {
          errorMessage = typeof errorData.details === 'string' 
            ? errorData.details 
            : JSON.stringify(errorData.details, null, 2);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(`Error updating template: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description);
      setTemplateCategory(template.category as TemplateCategory);
      setTemplateVersion(template.version);
      
      const formSteps = template.steps.map(step => ({
        name: step.name,
        description: step.description || '',
        command: step.command,
        timeout: step.timeout || 10000,
        retryable: step.retryable || false,
        required: step.required !== false,
        category: step.category || 'system',
        validations: step.validations?.map(v => ({
          type: v.type,
          value: v.value,
          description: v.description || '',
          required: v.required || false
        })) || []
      }));
      
      setSteps(formSteps);
    }
    onClose();
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full max-h-[90vh] bg-gray-900 rounded-lg shadow-xl border border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <DialogTitle className="text-xl font-semibold text-white">
              Edit Template: {template.name}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E.g.: Basic Linux Discovery"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value as TemplateCategory)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe what this template does..."
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={templateVersion}
                      onChange={(e) => setTemplateVersion(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Steps ({steps.length})</h3>
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                  </button>
                </div>

                {steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-white">Step {stepIndex + 1}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveStep(stepIndex, 'up')}
                          disabled={stepIndex === 0}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(stepIndex, 'down')}
                          disabled={stepIndex === steps.length - 1}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(stepIndex)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(stepIndex, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="step_name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
                        <input
                          type="number"
                          value={step.timeout}
                          onChange={(e) => updateStep(stepIndex, 'timeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => updateStep(stepIndex, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description of what this step does"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Command</label>
                      <input
                        type="text"
                        value={step.command}
                        onChange={(e) => updateStep(stepIndex, 'command', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="cat /etc/os-release"
                      />
                    </div>

                    {/* Validations */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-300">Validations ({step.validations.length})</h5>
                        <button
                          type="button"
                          onClick={() => addValidation(stepIndex)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          <Plus className="w-3 h-3" />
                          Validation
                        </button>
                      </div>

                      {step.validations.map((validation, validationIndex) => (
                        <div key={validationIndex} className="bg-gray-700 rounded p-3">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-300">Validation {validationIndex + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeValidation(stepIndex, validationIndex)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                              <select
                                value={validation.type}
                                onChange={(e) => updateValidation(stepIndex, validationIndex, 'type', e.target.value)}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {Object.entries(validationTypeLabels).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Value</label>
                              <input
                                type="text"
                                value={validation.value}
                                onChange={(e) => updateValidation(stepIndex, validationIndex, 'value', e.target.value)}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Value to verify"
                              />
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                            <input
                              type="text"
                              value={validation.description}
                              onChange={(e) => updateValidation(stepIndex, validationIndex, 'description', e.target.value)}
                              className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe this validation"
                            />
                          </div>

                          <div className="mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={validation.required}
                                onChange={(e) => updateValidation(stepIndex, validationIndex, 'required', e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-xs text-gray-400">Required validation</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                {steps.length} step{steps.length !== 1 ? 's' : ''} • {steps.reduce((acc, step) => acc + step.validations.length, 0)} validations
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Template'}
                </button>
              </div>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
} 