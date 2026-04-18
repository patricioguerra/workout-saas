'use client'

import { useState, useRef, useTransition, ViewTransition } from 'react'
import { saveBasicInfo } from '@/modules/onboarding/application/save-basic-info'
import { saveCategory } from '@/modules/onboarding/application/save-category'
import { saveFitnessData } from '@/modules/onboarding/application/save-fitness-data'
import { completeOnboarding } from '@/modules/onboarding/application/complete-onboarding'
import { updateAvatar } from '@/modules/identity/application/update-avatar'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase/client'

const TOTAL_STEPS = 10

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 bg-accent'
              : i < current
                ? 'w-2 bg-accent/50'
                : 'w-2 bg-white/20'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState({
    fullName: '',
    age: '',
    weight: '',
    sex: '',
    category: '',
    rmStrictPress: '',
    rmBackSquat: '',
    rmDeadlift: '',
    run5kMinutes: '',
  })

  function goNext() {
    setError(null)
    setDirection('forward')
    startTransition(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    })
  }

  function goBack() {
    setError(null)
    setDirection('back')
    startTransition(() => {
      setStep((s) => Math.max(s - 1, 0))
    })
  }

  function updateField(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveAndContinue() {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('fullName', data.fullName)
    formData.set('age', data.age)
    formData.set('weight', data.weight)
    formData.set('sex', data.sex)

    const result = await saveBasicInfo(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setLoading(false)
    goNext()
  }

  async function handleSaveCategory() {
    setLoading(true)
    setError(null)

    const result = await saveCategory(data.category)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setLoading(false)
    goNext()
  }

  async function handleSaveFitness() {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('rmStrictPress', data.rmStrictPress)
    formData.set('rmBackSquat', data.rmBackSquat)
    formData.set('rmDeadlift', data.rmDeadlift)
    formData.set('run5kMinutes', data.run5kMinutes)

    const result = await saveFitnessData(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setLoading(false)
    goNext()
  }

  async function handleSubscribe() {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        alert(data.error || 'Error al crear la sesion de pago')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      alert('Error de conexion')
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return data.fullName.trim().length > 0
      case 2: return data.age !== '' && parseInt(data.age) >= 14 && parseInt(data.age) <= 100
      case 3: return data.weight !== '' && parseFloat(data.weight) >= 30 && parseFloat(data.weight) <= 300
      case 4: return data.sex !== ''
      case 5: return data.category !== ''
      default: return true
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)' }}>
      {/* Header */}
      <div className="px-4 pt-safe-top" style={{ viewTransitionName: 'onboarding-header' }}>
        <div className="flex items-center justify-between h-14">
          {step > 0 && step < TOTAL_STEPS - 1 ? (
            <button onClick={goBack} className="text-sm text-muted">
              Atras
            </button>
          ) : (
            <div />
          )}
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <span className="text-sm text-muted">{step}/{TOTAL_STEPS - 2}</span>
          )}
        </div>
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <ProgressDots current={step - 1} total={TOTAL_STEPS - 2} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <ViewTransition
          key={step}
          enter={direction === 'forward' ? 'slide-forward' : 'slide-back'}
          exit={direction === 'forward' ? 'slide-forward' : 'slide-back'}
          default="none"
        >
          <div className="w-full max-w-sm">
            {step === 0 && <StepWelcome onNext={goNext} />}
            {step === 1 && (
              <StepInput
                label="Como te llamas?"
                subtitle="Asi podremos personalizar tu experiencia"
                type="text"
                placeholder="Tu nombre completo"
                value={data.fullName}
                onChange={(v) => updateField('fullName', v)}
                onNext={goNext}
                canProceed={canProceed()}
              />
            )}
            {step === 2 && (
              <StepInput
                label="Cuantos anos tienes?"
                subtitle="Adaptaremos la intensidad a tu edad"
                type="number"
                placeholder="25"
                value={data.age}
                onChange={(v) => updateField('age', v)}
                onNext={goNext}
                canProceed={canProceed()}
                min={14}
                max={100}
              />
            )}
            {step === 3 && (
              <StepInput
                label="Cual es tu peso?"
                subtitle="En kilogramos, para calibrar los ejercicios"
                type="number"
                placeholder="75"
                value={data.weight}
                onChange={(v) => updateField('weight', v)}
                onNext={goNext}
                canProceed={canProceed()}
                min={30}
                max={300}
                step={0.1}
                suffix="kg"
              />
            )}
            {step === 4 && (
              <StepSex
                value={data.sex}
                onChange={(v) => updateField('sex', v)}
                onNext={handleSaveAndContinue}
                canProceed={canProceed()}
                loading={loading}
                error={error}
              />
            )}
            {step === 5 && (
              <StepCategory
                value={data.category}
                onChange={(v) => updateField('category', v)}
                onNext={handleSaveCategory}
                canProceed={canProceed()}
                loading={loading}
                error={error}
              />
            )}
            {step === 6 && (
              <StepRM
                values={{
                  strictPress: data.rmStrictPress,
                  backSquat: data.rmBackSquat,
                  deadlift: data.rmDeadlift,
                }}
                onChange={(field, v) => {
                  const map: Record<string, string> = {
                    strictPress: 'rmStrictPress',
                    backSquat: 'rmBackSquat',
                    deadlift: 'rmDeadlift',
                  }
                  updateField(map[field], v)
                }}
                onNext={goNext}
                onSkip={goNext}
              />
            )}
            {step === 7 && (
              <StepRun5K
                value={data.run5kMinutes}
                onChange={(v) => updateField('run5kMinutes', v)}
                onNext={handleSaveFitness}
                onSkip={() => { handleSaveFitness() }}
                loading={loading}
              />
            )}
            {step === 8 && (
              <StepAvatar
                onNext={goNext}
                onSkip={goNext}
              />
            )}
            {step === 9 && (
              <StepPayment
                onSubscribe={handleSubscribe}
              />
            )}
          </div>
        </ViewTransition>
      </div>
    </div>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-2">
        <div className="text-6xl mb-6">💪</div>
        <h1 className="text-3xl font-bold">Bienvenido a Workout</h1>
        <p className="text-muted text-base">
          Entrenamientos semanales generados con IA,
          basados en metodologia profesional
        </p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
      >
        Empezar
      </button>
    </div>
  )
}

function StepInput({
  label,
  subtitle,
  type,
  placeholder,
  value,
  onChange,
  onNext,
  canProceed,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  subtitle: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onNext: () => void
  canProceed: boolean
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{label}</h2>
        <p className="text-muted text-sm">{subtitle}</p>
      </div>

      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canProceed && onNext()}
          min={min}
          max={max}
          step={step}
          autoComplete="off"
          className="w-full px-4 py-3.5 rounded-xl text-base input-glass"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">
            {suffix}
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
      >
        Siguiente
      </button>
    </div>
  )
}

function StepSex({
  value,
  onChange,
  onNext,
  canProceed,
  loading,
  error,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  canProceed: boolean
  loading: boolean
  error: string | null
}) {
  const options = [
    { value: 'male', label: 'Hombre' },
    { value: 'female', label: 'Mujer' },
    { value: 'other', label: 'Otro' },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Cual es tu sexo?</h2>
        <p className="text-muted text-sm">Para ajustar los ejercicios y cargas</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full px-4 py-3.5 rounded-xl text-base text-left transition-all ${
              value === opt.value
                ? 'glass border-accent/50 text-white'
                : 'glass text-muted hover:text-white'
            }`}
            style={value === opt.value ? { borderColor: 'var(--accent-orange)' } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed || loading}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
      >
        {loading ? 'Guardando...' : 'Siguiente'}
      </button>
    </div>
  )
}

function StepCategory({
  value,
  onChange,
  onNext,
  canProceed,
  loading,
  error,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  canProceed: boolean
  loading: boolean
  error: string | null
}) {
  const options = [
    { value: 'athx', label: 'ATHX', desc: 'Categoria estandar' },
    { value: 'athx_pro', label: 'ATHX PRO', desc: 'Avanzada — pesos mayores y dual dumbbell' },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tu categoria</h2>
        <p className="text-muted text-sm">En que categoria vas a competir?</p>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full px-4 py-4 rounded-xl text-left transition-all ${
              value === opt.value
                ? 'glass border-accent/50 text-white'
                : 'glass text-muted hover:text-white'
            }`}
            style={value === opt.value ? { borderColor: 'var(--accent-orange)' } : undefined}
          >
            <p className="text-base font-semibold">{opt.label}</p>
            <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed || loading}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
      >
        {loading ? 'Guardando...' : 'Siguiente'}
      </button>
    </div>
  )
}

function StepRM({
  values,
  onChange,
  onNext,
  onSkip,
}: {
  values: { strictPress: string; backSquat: string; deadlift: string }
  onChange: (field: string, v: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  const fields = [
    { key: 'strictPress', label: 'Strict Press' },
    { key: 'backSquat', label: 'Back Squat' },
    { key: 'deadlift', label: 'Deadlift' },
  ]

  const hasAny = Object.values(values).some((v) => v !== '')

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tus maximos de fuerza</h2>
        <p className="text-muted text-sm">Opcional — para personalizar las cargas</p>
      </div>

      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-sm text-muted mb-1 block">{f.label}</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={values[f.key as keyof typeof values]}
                onChange={(e) => onChange(f.key, e.target.value)}
                min={0}
                max={500}
                autoComplete="off"
                className="w-full px-4 py-3.5 rounded-xl text-base input-glass"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">kg</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={onNext}
          disabled={!hasAny}
          className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
        >
          Siguiente
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-sm text-muted hover:text-white transition-colors"
        >
          Omitir
        </button>
      </div>
    </div>
  )
}

function StepRun5K({
  value,
  onChange,
  onNext,
  onSkip,
  loading,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onSkip: () => void
  loading: boolean
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tu tiempo en 5K</h2>
        <p className="text-muted text-sm">Opcional — para calibrar el cardio</p>
      </div>

      <div className="relative">
        <input
          type="number"
          placeholder="25"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value && onNext()}
          min={10}
          max={60}
          autoComplete="off"
          className="w-full px-4 py-3.5 rounded-xl text-base input-glass"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">min</span>
      </div>

      <div className="space-y-3">
        <button
          onClick={onNext}
          disabled={loading || !value}
          className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
        >
          {loading ? 'Guardando...' : 'Siguiente'}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="w-full py-3 text-sm text-muted hover:text-white transition-colors"
        >
          Omitir
        </button>
      </div>
    </div>
  )
}

function StepAvatar({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maximo 5MB')
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setError(null)

    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setUploading(false); return }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setPreview(null)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    const result = await updateAvatar(publicUrl)
    if (result?.error) {
      setError(result.error)
      setPreview(null)
    } else {
      setUploaded(true)
    }
    setUploading(false)
  }

  async function handleNext() {
    await completeOnboarding()
    onNext()
  }

  async function handleSkip() {
    await completeOnboarding()
    onSkip()
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tu foto de perfil</h2>
        <p className="text-muted text-sm">Opcional — puedes añadirla despues</p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-28 h-28 rounded-full glass flex items-center justify-center overflow-hidden"
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={uploading}
          className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
        >
          {uploading ? 'Subiendo...' : 'Siguiente'}
        </button>
        {!uploaded && (
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-3 text-sm text-muted hover:text-white transition-colors"
          >
            Omitir
          </button>
        )}
      </div>
    </div>
  )
}

function StepPayment({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Ultimo paso</h2>
        <p className="text-muted text-sm">
          Accede a todos los entrenamientos semanales
        </p>
      </div>

      <div className="glass rounded-xl p-5 space-y-4">
        {[
          'Plan semanal completo (lunes a domingo)',
          'Generado con IA cada semana',
          'Metodologia profesional',
          'Cancela cuando quieras',
        ].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <span className="text-accent text-sm">✓</span>
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={onSubscribe}
          className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
        >
          Suscribirse
        </button>
        <a
          href="/entrenamiento"
          className="block w-full py-3 text-center text-sm text-muted hover:text-white transition-colors"
        >
          Continuar sin suscripcion
        </a>
      </div>
    </div>
  )
}
