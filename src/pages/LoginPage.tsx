import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { loginSchema, LoginFormData } from '../utils/validation';
import toast from 'react-hot-toast';
import FitPilotLogo from '../assets/FitPilot-Logo.svg?react';

// Componente de fondo animado con formas flotantes
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      {/* Gradiente base claro */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-primary-50 to-indigo-100" />

      {/* Círculos animados flotantes - MUY RÁPIDAS */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-xl"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${-5 + i * 18}%`,
            top: `${5 + (i % 3) * 28}%`,
            background: i % 3 === 0
              ? 'rgba(59, 130, 246, 0.4)'
              : i % 3 === 1
              ? 'rgba(99, 102, 241, 0.35)'
              : 'rgba(139, 92, 246, 0.3)',
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, 70, 0],
            scale: [1, 1.4, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5 + i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Forma decorativa grande arriba */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-2xl"
        style={{
          left: '-10%',
          top: '-15%',
          background: 'rgba(16, 185, 129, 0.35)',
        }}
        animate={{
          scale: [1, 1.5, 1],
          x: [0, 100, 0],
          y: [0, 80, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Forma decorativa abajo derecha */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full blur-2xl"
        style={{
          right: '-8%',
          bottom: '-5%',
          background: 'rgba(236, 72, 153, 0.3)',
        }}
        animate={{
          scale: [1, 1.5, 1],
          x: [0, -80, 0],
          y: [0, -70, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear error on unmount
    return () => clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success(t('messages.loginSuccess'));
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || t('errors.loginFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Fondo animado */}
      <AnimatedBackground />

      {/* Contenido */}
      <motion.div
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="h-64 w-auto mx-auto mb-4 flex justify-center"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <FitPilotLogo className="h-full w-auto" />
          </motion.div>
          <p className="text-gray-600">{t('tagline')}</p>
        </div>

        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('login.title')}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t('login.email')}
              type="email"
              placeholder={t('login.emailPlaceholder')}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('login.password')}
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              {t('login.submit')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              {t('demo.title')}
            </p>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p><strong>{t('demo.trainer')}:</strong> trainer1@fitpilot.com / password123</p>
              <p><strong>{t('demo.client')}:</strong> client1@fitpilot.com / password123</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
