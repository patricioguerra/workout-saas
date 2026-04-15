import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Tu entrenamiento semanal, generado por{" "}
            <span className="bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-purple)] bg-clip-text text-transparent">
              IA
            </span>
          </h1>
          <p className="text-muted text-base leading-relaxed">
            Cada semana recibes un plan completo de entrenamiento,
            creado con inteligencia artificial y basado en una metodologia probada.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/entrenamiento"
            className="w-full py-3.5 rounded-xl text-base font-semibold text-center btn-gradient"
          >
            Ver entrenamiento
          </Link>
          <Link
            href="/login"
            className="w-full py-3.5 rounded-xl text-base font-semibold text-center glass hover:bg-white/10 transition-colors"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
