import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Tu entrenamiento semanal, generado por IA
        </h1>
        <p className="text-lg text-gray-600">
          Cada semana recibes un plan de entrenamiento completo,
          creado con inteligencia artificial y basado en una metodologia probada.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/entrenamiento"
            className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Ver entrenamiento
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border rounded-md hover:bg-gray-50"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
