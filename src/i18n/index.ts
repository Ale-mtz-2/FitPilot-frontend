import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esExercises from './locales/es/exercises.json';
import esTraining from './locales/es/training.json';
import esClients from './locales/es/clients.json';
import esAi from './locales/es/ai.json';
import esErrors from './locales/es/errors.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enExercises from './locales/en/exercises.json';
import enTraining from './locales/en/training.json';
import enClients from './locales/en/clients.json';
import enAi from './locales/en/ai.json';
import enErrors from './locales/en/errors.json';

export const defaultNS = 'common';
export const resources = {
  es: {
    common: esCommon,
    auth: esAuth,
    exercises: esExercises,
    training: esTraining,
    clients: esClients,
    ai: esAi,
    errors: esErrors,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    exercises: enExercises,
    training: enTraining,
    clients: enClients,
    ai: enAi,
    errors: enErrors,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es', // Spanish as default
    defaultNS,
    ns: ['common', 'auth', 'exercises', 'training', 'clients', 'ai', 'errors'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fitpilot_language',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
