"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getAuthStatusAction, loginAction, logoutAction } from "@/app/_lib/actions";
import { useLanguage } from "./LanguageProvider";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
    const router = useRouter();
    const { t } = useLanguage();
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
                toast.success(t.nav.signedInSuccess);
                router.refresh();
            } else {
                toast.error(result.error || t.nav.incorrectPassword);
            }
        });
    };

    const handleLogout = () => {
        startTransition(async () => {
            await logoutAction();
            setIsLoggedIn(false);
            toast.success(t.nav.signedOutSuccess);
            router.push("/");
            router.refresh();
        });
    };

    return (
        <>
            <nav className="bg-white dark:bg-gh-surface border-b border-gray-200 dark:border-gh-border shadow-xs fixed top-0 w-full h-15 z-10 flex items-center justify-between font-medium text-md px-4 text-gray-800 dark:text-gh-text transition-colors">
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
                        <span className="text-transparent [-webkit-text-stroke:1px_black] dark:[-webkit-text-stroke:1px_white]">BlogDo</span>
                        <span className="text-blue-500 dark:text-gh-blue">Obertobr</span>
                    </Link>

                    <Link href="/" className="hover:font-bold transition-all text-gray-700 dark:text-gh-text hover:text-black dark:hover:text-white">
                        {t.nav.recent}
                    </Link>
                    <Link href="/relevant" className="hover:font-bold transition-all text-gray-700 dark:text-gh-text hover:text-black dark:hover:text-white">
                        {t.nav.relevant}
                    </Link>

                    {isLoggedIn && (
                        <>
                            <Link href="/createPost" className="hover:font-bold transition-all text-gray-700 dark:text-gh-text hover:text-black dark:hover:text-white">
                                {t.nav.createPost}
                            </Link>
                            <Link href="/adminPanel" className="hover:font-bold transition-all text-gray-700 dark:text-gh-text hover:text-black dark:hover:text-white">
                                {t.nav.adminTags}
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:font-bold cursor-pointer transition-all"
                            >
                                {t.nav.signOut}
                            </button>
                        </>
                    )}
                </div>

                <div className="flex gap-2.5 items-center">
                    <ThemeToggle />
                    <LanguageToggle />
                </div>
            </nav>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gh-surface rounded-lg shadow-xl w-full max-w-sm p-5 border border-gray-200 dark:border-gh-border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gh-text">{t.nav.adminAccess}</h2>
                            <button
                                type="button"
                                onClick={() => { setModalOpen(false); setPassword(""); }}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-gh-text text-lg cursor-pointer"
                            >
                                🗙
                            </button>
                        </div>
                        <form onSubmit={handleLogin} className="flex flex-col gap-3">
                            <input
                                type="password"
                                placeholder={t.nav.adminPasswordPlaceholder}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                className="border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-900 dark:text-gh-text placeholder-gray-400 dark:placeholder-gh-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setModalOpen(false); setPassword(""); }}
                                    className="px-3 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gh-muted hover:bg-gray-100 dark:hover:bg-gh-subtle transition cursor-pointer"
                                >
                                    {t.nav.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? t.nav.signingIn : t.nav.signIn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
