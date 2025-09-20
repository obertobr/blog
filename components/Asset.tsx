type AssetProps = {
    url: string
    onDelete: (url: string) => void
}

export default function Asset({ url, onDelete }: AssetProps) {
    return (
        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-400 flex-shrink-0">
            <img className="w-full h-full object-cover object-center" src={url}/>
            <button className="absolute bottom-1 left-[50%] -translate-x-1/2 p-1 pl-3 pr-3 text-sm bg-white rounded-md shadow-sm/70 cursor-pointer  hover:shadow-md/70 transition">Copiar</button>
            <button onClick={() => {onDelete(url)}} className="absolute top-2 right-2 bg-red-600 w-7 h-7 text-white rounded-md opacity-40 shadow-md/50 cursor-pointer hover:opacity-100 transition duration-75">🗙︎</button>
        </div>
    )
}