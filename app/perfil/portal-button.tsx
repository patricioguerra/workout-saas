'use client'

export function PortalButton() {
  async function handlePortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) {
      window.location.href = url
    }
  }

  return (
    <button
      onClick={handlePortal}
      className="w-full py-2 border rounded-md hover:bg-gray-50"
    >
      Gestionar suscripcion
    </button>
  )
}
