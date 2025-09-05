export default function NavBar() {
    return (
        <nav className="bg-white shadow-md fixed top-0 w-full h-15 z-10 flex items-center justify-between font-medium text-md px-2">
            <div className="flex gap-3 items-center">
                <div className="text-2xl font-extrabold"><span className="text-transparent [-webkit-text-stroke:1px_black]">BlogDo</span><span className="text-blue-500">Obertobr</span></div>
                <span>Recentes</span>
                <span>Relevantes</span>
            </div>
            <div className="flex gap-3 items-center">
                <select className="bg-gray-50
                                     border
                                     border-gray-300
                                     text-gray-900
                                     text-sm
                                     rounded-lg
                                     focus:ring-blue-500
                                     focus:border-blue-500
                                     block w-full
                                     p-1">
                    <option>light</option>
                    <option>dark</option>
                </select>
                <select className="bg-gray-50
                                     border
                                     border-gray-300
                                     text-gray-900
                                     text-sm
                                     rounded-lg
                                     focus:ring-blue-500
                                     focus:border-blue-500
                                     block w-full
                                     p-1">
                    <option>pt-br</option>
                    <option>en</option>
                </select>
            </div>
        </nav>
    )
}