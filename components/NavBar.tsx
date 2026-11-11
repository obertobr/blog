"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getAuthStatusAction, loginAction, logoutAction } from "@/app/_lib/actions";

export default function NavBar() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [password, setPassword] = useState("");

    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const didTriggerLongPress = useRef(false);

    useEffect(() => {
        getAuthStatusAction().then(res => {
            setIsLoggedIn(res.authenticated);
        });
    }, []);

    const startPress = () => {
        didTriggerLongPress.current = false;
        pressTimer.current = setTimeout(() => {
            didTriggerLongPress.current = true;
            setModalOpen(true);
        }, 5000);
    };

    const cancelPress = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const handleLogoClick = (e: React.MouseEvent) => {
        if (didTriggerLongPress.current) {
            e.preventDefault();
            didTriggerLongPress.current = false;
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        startTransition(async () => {
            const result = await loginAction(null, password);
            if (result.success) {
                setIsLoggedIn(true);
                setModalOpen(false);
                setPassword("");
                toast.success("Logado com sucesso!");
                router.refresh();
            } else {
                toast.error(result.error || "Senha incorreta");
            }
        });
    };

    const handleLogout = () => {
        startTransition(async () => {
            await logoutAction();
            setIsLoggedIn(false);
            toast.success("Desconectado!");
            router.push("/");
            router.refresh();
        });
    };

    return (
        <>
            <nav className="bg-white shadow-md fixed top-0 w-full h-15 z-10 flex items-center justify-between font-medium text-md px-4">
                <div className="flex gap-4 items-center">
                    <Link
                        href="/"
                        onClick={handleLogoClick}
                        onMouseDown={startPress}
                        onMouseUp={cancelPress}
                        onMouseLeave={cancelPress}
                        onTouchStart={startPress}
                        onTouchEnd={cancelPress}
                        className="text-2xl font-extrabold select-none cursor-pointer"
                    >
                        <span className="text-transparent [-webkit-text-stroke:1px_black]">BlogDo</span>
                        <span className="text-blue-500">Obertobr</span>
                    </Link>

                    <Link href="/" className="hover:font-bold transition-all">
                        Recentes
                    </Link>
                    <Link href="/relevant" className="hover:font-bold transition-all">
                        Relevantes
                    </Link>

                    {isLoggedIn && (
                        <>
                            <Link href="/createPost" className="hover:font-bold transition-all">
                                Criar Post
                            </Link>
                            <Link href="/adminPanel" className="hover:font-bold transition-all">
                                Admin Tags
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-700 hover:font-bold cursor-pointer transition-all"
                            >
                                Sair
                            </button>
                        </>
                    )}
                </div>

                <div className="flex gap-3 items-center">
                    <select
                        aria-label="Selecionar tema"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                    >
                        <option>light</option>
                        <option>dark</option>
                    </select>
                    <select
                        aria-label="Selecionar idioma"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                    >
                        <option>pt-br</option>
                        <option>en</option>
                    </select>
                </div>
            </nav>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Acesso Administrativo</h2>
                            <button
                                type="button"
                                onClick={() => { setModalOpen(false); setPassword(""); }}
                                className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
                            >
                                🗙
                            </button>
                        </div>
                        <form onSubmit={handleLogin} className="flex flex-col gap-3">
                            <input
                                type="password"
                                placeholder="Senha administrativa"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setModalOpen(false); setPassword(""); }}
                                    className="px-3 py-1.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? "Entrando..." : "Entrar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
