import Link from "next/link";

export default function NotFound() {
    return (
        <div className="max-w-4xl mx-auto p-10 text-center flex flex-col items-center gap-4">
            <h1 className="text-6xl font-extrabold text-gray-300">404</h1>
            <h2 className="text-2xl font-bold text-gray-700">Página não encontrada</h2>
            <p className="text-gray-500">O post que você procura não existe ou foi removido.</p>
            <Link
                href="/"
                className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
            >
                Voltar para o início
            </Link>
        </div>
    );
}

