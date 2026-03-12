import { describe, expect, it } from 'vitest';
import type { IHistoryClient } from '@/features/client-history/types';
import { mapFormToOnboardingPayload, mapHistoryToIntakeForm } from './mappers';
import { createDefaultClientIntakeFormState } from './types';

const buildHistoryFixture = (): IHistoryClient => ({
  id: 12,
  name: 'Laura',
  lastname: 'Rivas',
  email: 'laura@example.com',
  created_at: '2026-03-01T10:00:00.000Z',
  updated_at: '2026-03-02T10:00:00.000Z',
  is_active: true,
  role: 'CLIENT',
  phone_number: '+5218111111111',
  profile_picture: null,
  deleted_at: null,
  username: 'laura.r',
  is_phone_verified: true,
  date_of_birth: '1993-08-22T00:00:00.000Z',
  onboarding_status: 'pending',
  onboarding_completed_at: null,
  client_allergens: [
    {
      client_id: 12,
      allergen_id: 8,
      allergens: {
        id: 8,
        name: 'Lactosa',
        type: 'intolerance',
        created_at: '2026-02-01T00:00:00.000Z',
      },
    },
  ],
  client_goals: [
    {
      id: 1,
      client_id: 12,
      goal_id: 3,
      is_primary: true,
      created_at: '2026-02-01T00:00:00.000Z',
      goals: {
        id: 3,
        code: 'lose_fat',
        name: 'Perdida de grasa',
        description: null,
        created_at: '2026-02-01T00:00:00.000Z',
      },
    },
  ],
  client_records: [
    {
      id: 9,
      client_id: 12,
      medical_conditions: 'Hipotiroidismo',
      notes: 'Paciente en seguimiento endocrino',
      preferences: {
        likes: ['Avena', 'Yogurt griego'],
        dislikes: ['Pescado'],
      },
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
    },
  ],
  daily_targets: [],
  client_metrics: [
    {
      id: '2',
      user_id: 12,
      date: '2026-03-01',
      logged_at: '2026-03-01T08:00:00.000Z',
      weight_kg: '74.2',
      height_cm: '165',
      body_fat_pct: '',
      muscle_mass_kg: '',
      visceral_fat: null,
      water_pct: null,
      waist_cm: null,
      hip_cm: null,
      chest_cm: null,
      arm_left_cm: null,
      arm_right_cm: null,
      thigh_left_cm: null,
      thigh_right_cm: null,
      calf_left_cm: null,
      calf_right_cm: null,
      notes: '',
      recorded_by_user_id: null,
    },
  ],
  client_health_metrics: [],
  client_injuries: [
    {
      id: 20,
      user_id: 12,
      name: 'Esguince de tobillo',
      body_part: 'Tobillo derecho',
      severity: 2,
      status: 'recovered',
      limitations: 'Evitar impactos altos',
      diagnosis_date: '2025-12-01T00:00:00.000Z',
      recovery_date: null,
      created_at: '2025-12-01T00:00:00.000Z',
    },
  ],
  appointments: [],
});

describe('client-intake mappers', () => {
  it('maps history payload into editable intake form state', () => {
    const history = buildHistoryFixture();

    const formState = mapHistoryToIntakeForm(history);

    expect(formState.goal_ids).toEqual([3]);
    expect(formState.allergen_ids).toEqual([8]);
    expect(formState.date_of_birth).toBe('1993-08-22');
    expect(formState.weight_kg).toBe('74.2');
    expect(formState.height_cm).toBe('165');
    expect(formState.likes).toEqual(['Avena', 'Yogurt griego']);
    expect(formState.dislikes).toEqual(['Pescado']);
    expect(formState.injuries).toHaveLength(1);
    expect(formState.injuries[0].status).toBe('recovered');
    expect(formState.medical_conditions).toBe('Hipotiroidismo');
  });

  it('maps form state into onboarding payload, trimming and filtering empty rows', () => {
    const formState = createDefaultClientIntakeFormState();
    formState.goal_ids = [1, 2, 2];
    formState.allergen_ids = [9];
    formState.date_of_birth = '1991-11-03';
    formState.weight_kg = '80,5';
    formState.height_cm = '';
    formState.likes = ['  Frijoles  ', 'frijoles', 'Aguacate'];
    formState.dislikes = [''];
    formState.medical_conditions = '  Ninguna  ';
    formState.notes = '  Nota breve  ';
    formState.injuries = [
      {
        name: '  Dolor lumbar ',
        body_part: 'Espalda baja',
        severity: '3',
        status: 'active',
        limitations: 'Evitar sentadillas pesadas',
        diagnosis_date: '2026-01-15',
      },
      {
        name: '',
        body_part: '',
        severity: '',
        status: 'active',
        limitations: '',
        diagnosis_date: '',
      },
    ];

    const payload = mapFormToOnboardingPayload(44, formState);

    expect(payload.user_id).toBe(44);
    expect(payload.date_of_birth).toBe('1991-11-03');
    expect(payload.goals).toEqual([{ id: 1 }, { id: 2 }]);
    expect(payload.allergens).toEqual([{ id: 9 }]);
    expect(payload.metrics).toEqual({ weight_kg: 80.5 });
    expect(payload.preferences.likes).toEqual(['Frijoles', 'Aguacate']);
    expect(payload.preferences.dislikes).toEqual([]);
    expect(payload.injuries).toHaveLength(1);
    expect(payload.injuries[0].severity).toBe(3);
    expect(payload.medical_conditions).toBe('Ninguna');
    expect(payload.notes).toBe('Nota breve');
  });
});

