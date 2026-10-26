'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, DEMO_USERS } from '@/context/AuthContext';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
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

  const [activeTab, setActiveTab] = useState<'credentials' | 'quick_access'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fillAndLogin = async (id: string, pass: string) => {
    setValue('identifier', id, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(id, pass, true);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased">
      
      {/* ================= LEFT HALF: FULL-BLEED PHOTOGRAPHIC HERO (Expanded Picture Size) ================= */}
      <div className="w-full lg:w-[58%] relative min-h-[480px] lg:min-h-screen bg-slate-950 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 overflow-hidden">
        {/* Full-bleed laboratory background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/pharma-hero.jpg"
          alt="Citi Pharma Laboratory Quality Control"
          className="absolute inset-0 w-full h-full object-cover object-top sm:object-center"
        />

        {/* Ambient Dark Gradient Layer for Optimal Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/15" />
        <div className="absolute inset-0 bg-blue-950/10 mix-blend-multiply" />

        {/* Top Header Row of Left Side */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          {/* Floating Logo Card (Compact, sleek & well-proportioned) */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-white/20">
            <CityPharmaLogo variant="mark-only" size="sm" />
            <span className="text-xs sm:text-sm font-black text-[#0A192F] tracking-tight leading-none">Citi Pharma</span>
          </div>
        </div>

        {/* Bottom Content of Left Side - Clean, uncluttered 2-line title */}
        <div className="relative z-10 max-w-2xl pt-6 sm:pt-8 lg:pt-10">
          <h1 className="text-2xl sm:text-3xl lg:text-[2.2rem] xl:text-[2.55rem] font-black text-white tracking-tight leading-[1.15]">
            <span className="block">Excellence in Quality Testing &amp;</span>
            <span className="block text-white">Pharmaceutical Analysis.</span>
          </h1>
        </div>
      </div>

      {/* ================= RIGHT HALF: CLEAN WHITE CANVAS ================= */}
      <div className="w-full lg:w-[42%] min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center py-4">
          
          {/* Top Bar: Return button */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Header matching reference: Colored dot kicker + Bold Title + Subtitle */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                AUTHORIZED LIMS ACCESS
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#0A192F] tracking-tight">
              Sign in to your account
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
              Enter your analytical credentials to enter laboratory workspaces
            </p>
          </div>

          {/* Segmented Pill Tabs matching reference: [1 Credenziali] [2 Dati personali] */}
          <div className="mt-6 p-1 rounded-2xl bg-slate-100 flex items-center gap-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={cn(
                'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                activeTab === 'credentials'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span className={cn(
                'h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center',
                activeTab === 'credentials' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
              )}>
                1
              </span>
              <span>Credentials</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quick_access')}
              className={cn(
                'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                activeTab === 'quick_access'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span className={cn(
                'h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center',
                activeTab === 'quick_access' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              )}>
                2
              </span>
              <span>Quick Staff Roles</span>
            </button>
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

          {/* TAB 1: Credentials Form matching reference field styling */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              {/* Username or Email with uppercase label & asterisk */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Username or Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    disabled={isSubmitting || authLoading}
                    placeholder="e.g. admin@citypharma.com"
                    className={`block w-full px-4 py-3 text-xs rounded-xl border bg-slate-50/40 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all ${
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

              {/* Password with uppercase label & asterisk */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmitting || authLoading}
                    placeholder="Min. 8 characters"
                    className={`block w-full px-4 py-3 pr-11 text-xs rounded-xl border bg-slate-50/40 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all ${
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
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
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
              <div className="flex items-center justify-between text-xs pt-1">
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
                className="w-full mt-2 py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0055D4] active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting || authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In to LIMS</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('quick_access')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0066FF] font-medium transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#0066FF]" />
                  <span>Looking for demo profiles? <strong>Switch to Quick Roles →</strong></span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Quick Staff Roles */}
          {activeTab === 'quick_access' && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Select a predefined testing persona to test RBAC routing:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                >
                  ← Manual Form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {DEMO_USERS.map((demo) => {
                  const targetUser = demo.username || demo.email;
                  const targetPass = (demo as any).password || 'Password@123';
                  const isAdmin = demo.role === 'ADMIN';

                  return (
                    <div
                      key={demo.email}
                      className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={cn(
                              'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                              isAdmin
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            )}
                          >
                            {(demo as any).labBadge}
                          </span>
                          {isAdmin ? (
                            <span className="text-[9px] font-bold text-purple-600">Master Admin</span>
                          ) : (
                            <span className="text-[9px] font-bold text-blue-600">QC Analyst</span>
                          )}
                        </div>

                        <div className="text-[11px] font-bold text-slate-800 leading-tight">
                          {demo.name}
                        </div>

                        <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-sans">User:</span>
                            <strong className="text-slate-900 truncate max-w-[130px]">{targetUser}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-sans">Pass:</span>
                            <strong className="text-slate-900">{targetPass}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            fillCredentials(targetUser, targetPass);
                            setActiveTab('credentials');
                          }}
                          className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-center cursor-pointer"
                        >
                          Fill Form
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting || authLoading}
                          onClick={() => fillAndLogin(targetUser, targetPass)}
                          className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-[#0066FF] hover:bg-[#0055D4] text-white transition-colors text-center shadow-2xs cursor-pointer"
                        >
                          1-Click Login
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer */}
        <div className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>Citi Pharma Quality Control LIMS • 21 CFR Part 11 & cGMP Certified</span>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0066FF]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
