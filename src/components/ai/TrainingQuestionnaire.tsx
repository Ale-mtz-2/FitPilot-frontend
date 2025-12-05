import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgress } from './StepProgress';
import { ProfileStep } from './steps/ProfileStep';
import { GoalsStep } from './steps/GoalsStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { RestrictionsStep } from './steps/RestrictionsStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { useAIStore } from '../../store/aiStore';
import type { QuestionnaireAnswers } from '../../types/ai';

// Steps for interview mode (without preferences/duration)
const INTERVIEW_STEPS = ['profile', 'goals', 'availability', 'equipment', 'restrictions'];

// Steps for template mode (all steps including preferences/duration)
const TEMPLATE_STEPS = ['profile', 'goals', 'availability', 'equipment', 'restrictions', 'preferences'];

export type QuestionnaireMode = 'interview' | 'template';

export interface TrainingQuestionnaireProps {
  /**
   * Mode of the questionnaire
   * - 'interview': For client initial assessment (5 steps, no program duration)
   * - 'template': For AI generator (6 steps with preferences and duration)
   */
  mode: QuestionnaireMode;

  /**
   * Initial data to pre-fill the form (optional)
   */
  initialData?: Partial<QuestionnaireAnswers>;

  /**
   * Callback when the questionnaire is completed
   */
  onComplete: (data: QuestionnaireAnswers) => void;

  /**
   * Optional callback for when answers change
   */
  onChange?: (data: QuestionnaireAnswers) => void;

  /**
   * Whether to show loading state
   */
  isLoading?: boolean;

  /**
   * Custom submit button text
   */
  submitButtonText?: string;

  /**
   * Optional array of step indices to show (for incomplete interviews).
   * If provided, only these steps will be displayed.
   * Example: [0, 3] would show only Profile (0) and Equipment (3) steps.
   */
  stepsToShow?: number[];
}

export const TrainingQuestionnaire: React.FC<TrainingQuestionnaireProps> = ({
  mode,
  initialData,
  onComplete,
  onChange,
  isLoading = false,
  submitButtonText,
  stepsToShow,
}) => {
  const { t } = useTranslation('ai');

  // Use the AI store for state management
  const {
    currentStep,
    answers,
    setAnswers,
    goToStep,
  } = useAIStore();

  // Determine which steps to use based on mode
  const allStepIds = mode === 'interview' ? INTERVIEW_STEPS : TEMPLATE_STEPS;

  // Filter steps if stepsToShow is provided
  const stepIds = stepsToShow && stepsToShow.length > 0
    ? stepsToShow.map(index => allStepIds[index]).filter(Boolean)
    : allStepIds;
  const totalSteps = stepIds.length;

  // Initialize with provided data if any
  useEffect(() => {
    if (initialData) {
      setAnswers(initialData);
    }
  }, []);

  // Sync local step with store - reset to 0 when stepsToShow changes or step is out of bounds
  useEffect(() => {
    if (currentStep >= totalSteps) {
      goToStep(Math.max(0, totalSteps - 1));
    }
  }, [mode, currentStep, totalSteps, goToStep]);

  // Reset to first step when stepsToShow changes
  useEffect(() => {
    if (stepsToShow && stepsToShow.length > 0) {
      goToStep(0);
    }
  }, [stepsToShow?.join(',')]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(answers);
  }, [answers, onChange]);

  const steps = stepIds.map((id) => ({
    id,
    title: t(`steps.${id}`),
  }));

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      onComplete(answers);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Only allow going to completed steps or the next step
    if (step <= currentStep + 1 && step < totalSteps) {
      goToStep(step);
    }
  };

  const renderStep = () => {
    const stepId = stepIds[currentStep];
    switch (stepId) {
      case 'profile':
        return <ProfileStep />;
      case 'goals':
        return <GoalsStep />;
      case 'availability':
        return <AvailabilityStep />;
      case 'equipment':
        return <EquipmentStep />;
      case 'restrictions':
        return <RestrictionsStep />;
      case 'preferences':
        return <PreferencesStep />;
      default:
        return null;
    }
  };

  const isStepValid = (): boolean => {
    const stepId = stepIds[currentStep];
    switch (stepId) {
      case 'profile':
        return !!answers.fitness_level;
      case 'goals':
        return !!answers.primary_goal;
      case 'availability':
        return !!answers.days_per_week && !!answers.session_duration_minutes;
      case 'equipment':
        return (
          answers.has_gym_access !== undefined &&
          (answers.available_equipment?.length ?? 0) > 0
        );
      case 'restrictions':
        // Restrictions are optional
        return true;
      case 'preferences':
        // For template mode, require program duration fields
        return !!answers.total_weeks && !!answers.start_date;
      default:
        return false;
    }
  };

  const getSubmitButtonText = () => {
    if (submitButtonText) return submitButtonText;
    if (mode === 'interview') {
      return t('wizard.saveInterview');
    }
    return t('wizard.generateProgram');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <StepProgress
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderStep()}

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 || isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('wizard.previous')}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || isLoading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {currentStep === totalSteps - 1 ? getSubmitButtonText() : t('wizard.next')}
          </button>
        </div>
      </div>

      {/* Summary indicator for interview mode */}
      {mode === 'interview' && (
        <div className="mt-4 text-center text-sm text-gray-500">
          {t('wizard.interviewNote')}
        </div>
      )}
    </div>
  );
};

export default TrainingQuestionnaire;
