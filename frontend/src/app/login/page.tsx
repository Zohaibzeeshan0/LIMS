'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, DEMO_USERS } from '@/context/AuthContext';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  BarChart3,
  ShieldCheck,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Users,
  Globe,
  Leaf,
  ChevronDown,
  Sparkles,
  ChevronUp,
} from 'lucide-react';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username or Email is required')
    .max(100, 'Identifier is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(4, 'Password must be at least 4 characters'),
  rememberMe: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const { login, rememberedIdentifier, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoProfiles, setShowDemoProfiles] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: rememberedIdentifier || '',
      password: '',
      rememberMe: true,
    },
  });

  // Pre-fill remembered identifier if available
  useEffect(() => {
    if (rememberedIdentifier) {
      setValue('identifier', rememberedIdentifier);
    }
  }, [rememberedIdentifier, setValue]);

  // Check URL query parameters for session errors
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setErrorMessage('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(data.identifier, data.password, data.rememberMe);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (id: string, pass: string) => {
    setValue('identifier', id, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F5FA] flex flex-col justify-between font-sans">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* ================= LEFT COLUMN: HERO & BRAND SHOWCASE ================= */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Logo Header */}
          <div>
            <CityPharmaLogo
              variant="full"
              size="lg"
              theme="light"
              subtitle="Care to Cure"
            />

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A192F] tracking-tight mt-6 leading-tight">
              Laboratory<br />Management<br />System
            </h1>

            <p className="text-base sm:text-lg text-[#0066FF] font-semibold mt-2.5">
              Quality Testing for a Healthier Tomorrow
            </p>

            {/* 5 Feature Badges in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 max-w-xl">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                <div className="h-8 w-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Sample Management</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                <div className="h-8 w-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Accurate Test Results</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                <div className="h-8 w-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Regulatory Compliance</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs backdrop-blur-xs">
                <div className="h-8 w-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Complete Traceability</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs backdrop-blur-xs sm:col-span-2">
                <div className="h-8 w-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Efficient Automated Workflow</span>
              </div>
            </div>
          </div>

          {/* Laboratory Scientist Microscope Image Feature */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-white max-w-2xl h-64 sm:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lab-scientist.jpg"
              alt="Quality Control Scientist in Pharmaceutical Laboratory"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Bottom 4 Assurance Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/80 text-slate-600 text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#0066FF] shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">Quality</span>
                <span className="text-[10px] text-slate-400">Assured Testing</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0066FF] shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">Trusted</span>
                <span className="text-[10px] text-slate-400">by Professionals</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#0066FF] shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">Compliant</span>
                <span className="text-[10px] text-slate-400">with Global Standards</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">Care to Cure</span>
                <span className="text-[10px] text-slate-400">Pharmaceutical Excellence</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CLEAN FLOATING CARD ================= */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          {/* Top Language Pill matching design */}
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium">English</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          {/* Floating White Authentication Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/70 border border-slate-200/80">
            {/* Center Citi Pharma Logo */}
            <div className="flex flex-col items-center justify-center text-center">
              <CityPharmaLogo
                variant="mark-only"
                size="lg"
                className="mb-1"
              />
              <span className="font-black text-2xl tracking-tight text-[#0A192F]">
                Citi Pharma
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Care to Cure
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-[#0A192F] tracking-tight mt-5">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Login to your Laboratory Management System
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 font-medium">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              {/* Username or Email */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Username or Email
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    disabled={isSubmitting || authLoading}
                    placeholder="Enter your username or email"
                    className={`block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all ${
                      errors.identifier
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-[#0066FF]'
                    }`}
                    {...register('identifier')}
                  />
                </div>
                {errors.identifier && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmitting || authLoading}
                    placeholder="Enter your password"
                    className={`block w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all ${
                      errors.password
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-[#0066FF]'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] transition"
                    {...register('rememberMe')}
                  />
                  <span className="text-slate-600 font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert('Please contact City Pharma IT / QA Department to reset your password.')}
                  className="font-semibold text-[#0066FF] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Blue Login Button */}
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full mt-3 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0055D4] active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting || authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>

              {/* Quick Persona Switcher for easy testing */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDemoProfiles(!showDemoProfiles)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 py-1 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0066FF]" />
                    <span>Quick-Select Personnel (Testing Roles)</span>
                  </span>
                  {showDemoProfiles ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>

                {showDemoProfiles && (
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 animate-in fade-in duration-200">
                    {DEMO_USERS.map((demo) => (
                      <button
                        key={demo.email}
                        type="button"
                        onClick={() => fillCredentials(demo.email, (demo as any).password || 'Password@123')}
                        className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-bold text-[#0066FF] uppercase">
                            {(demo as any).labBadge || demo.role.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800 leading-tight truncate">
                          {demo.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F5FA] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0066FF]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
