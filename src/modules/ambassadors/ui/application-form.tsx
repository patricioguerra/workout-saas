'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { applyAsAmbassador } from '../application/apply'

export function ApplicationForm() {
  const t = useTranslations('ambassadors.form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [socialLink, setSocialLink] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await applyAsAmbassador({ name, email, socialLink, message })
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="glass rounded-xl px-6 py-8 text-center space-y-2">
        <p className="text-lg font-semibold">{t('successTitle')}</p>
        <p className="text-muted text-sm">{t('successBody')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="name">
          {t('nameLabel')}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="email">
          {t('emailLabel')}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="socialLink">
          {t('socialLinkLabel')}
        </label>
        <input
          id="socialLink"
          type="url"
          value={socialLink}
          onChange={(e) => setSocialLink(e.target.value)}
          placeholder={t('socialLinkPlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="message">
          {t('messageLabel')}
        </label>
        <textarea
          id="message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('messagePlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim() || !email.trim() || !message.trim()}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50"
      >
        {pending ? t('submitSending') : t('submit')}
      </button>
    </form>
  )
}
